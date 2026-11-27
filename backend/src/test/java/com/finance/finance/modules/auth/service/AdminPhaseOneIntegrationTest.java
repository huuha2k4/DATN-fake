package com.finance.finance.modules.auth.service;

import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.admin.service.AdminService;
import com.finance.finance.modules.audit.context.RequestContextFilter;
import com.finance.finance.modules.auth.dto.request.GoogleAuthRequest;
import com.finance.finance.modules.auth.dto.request.LoginRequest;
import com.finance.finance.modules.auth.dto.request.RefreshTokenRequest;
import com.finance.finance.modules.auth.exception.InvalidCredentialsException;
import com.finance.finance.modules.auth.exception.InvalidTokenException;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static com.finance.finance.common.enums.CategoryKind.EXPENSE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "finora_phase1")
class AdminPhaseOneIntegrationTest {
    @Autowired WebApplicationContext web;
    @Autowired RequestContextFilter context;
    @Autowired UserRepository users;
    @Autowired CategoryRepository categories;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtTokenProvider jwt;
    @Autowired AdminService admin;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @MockitoSpyBean AuthService auth;

    private MockMvc mvc;
    private User operator;

    @BeforeEach
    void setUp() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("finora_phase1");
        mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(context).apply(springSecurity()).build();
        operator = users.findAll().stream().filter(User::isAdmin).findFirst().orElseThrow();
    }

    @Test
    void suspensionRevokesEverySessionAndUnlockRequiresAuthentication() throws Exception {
        User user = newUser();
        var session = auth.login(login(user), null);
        var rotated = auth.refreshToken(refresh(session.getRefreshToken()), null);
        var refresh = refresh(rotated.getRefreshToken());
        String bearer = "Bearer " + session.getAccessToken();
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", bearer)).andExpect(status().isForbidden());

        String requestId = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/admin/users/{id}/toggle-block", user.getId())
                .header("Authorization", adminBearer()).header("X-Request-Id", requestId)
                .header("X-Forwarded-For", "203.0.113.55"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userStatus").value("LOCKED"));
        assertThatThrownBy(() -> auth.login(login(user), null)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> auth.refreshToken(refresh, null)).isInstanceOf(InvalidTokenException.class);
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", bearer)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", "Bearer " + rotated.getAccessToken()))
                .andExpect(status().isUnauthorized());

        var payload = new GoogleIdToken.Payload();
        payload.setSubject("test-" + user.getId());
        payload.setEmail(user.getEmail());
        payload.setEmailVerified(true);
        doReturn(payload).when(auth).verifyGoogleIdToken("synthetic-verified-google-token");
        var google = new GoogleAuthRequest();
        google.setIdToken("synthetic-verified-google-token");
        assertThatThrownBy(() -> auth.authenticateWithGoogle(google, null)).isInstanceOf(InvalidCredentialsException.class);

        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM ops.audit_logs
                WHERE request_id = ? AND actor_id = ? AND subject_user_id = ?
                AND outcome = 'SUCCESS' AND event_type = 'ADMIN_USER_SUSPENDED' AND ip_address = '127.0.0.1'
                AND reason_code = 'ADMIN_TOGGLE_BLOCK'
                """, Integer.class, requestId, operator.getId(), user.getId())).isEqualTo(1);

        mvc.perform(post("/api/v1/admin/users/{id}/toggle-block", user.getId()).header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userStatus").value("ACTIVE"));
        assertThatThrownBy(() -> auth.refreshToken(refresh, null)).isInstanceOf(InvalidTokenException.class);
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", bearer)).andExpect(status().isUnauthorized());
        assertThat(auth.authenticateWithGoogle(google, null).getAccessToken()).isNotBlank();
        assertThat(auth.login(login(user), null).getAccessToken()).isNotBlank();
    }

    @Test
    void refreshWaitsForConcurrentSuspension() throws Exception {
        User user = newUser();
        var session = auth.login(login(user), null);
        var request = refresh(session.getRefreshToken());
        try (var executor = Executors.newSingleThreadExecutor()) {
            var locked = new CountDownLatch(1);
            var pendingRefresh = executor.submit(() -> {
                assertThat(locked.await(10, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> auth.refreshToken(request, null)).isInstanceOf(InvalidTokenException.class);
                return null;
            });
            tx.executeWithoutResult(status -> {
                admin.toggleBlockUser(user.getId());
                locked.countDown();
                // Wait until PostgreSQL reports that the competing request needs the user row.
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(8);
                while (System.nanoTime() < deadline) {
                    jdbc.execute("SELECT pg_stat_clear_snapshot()");
                    boolean waiting = Boolean.TRUE.equals(jdbc.queryForObject("""
                            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
                            WHERE wait_event_type = 'Lock' AND query ILIKE '%from core.users%')
                            """, Boolean.class));
                    if (waiting) {
                        return;
                    }
                    try {
                        Thread.sleep(30);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new AssertionError(e);
                    }
                }
                throw new AssertionError("Refresh did not wait for the suspension transaction");
            });
            pendingRefresh.get(10, TimeUnit.SECONDS);
        }
    }

    @Test
    void protectsSoleAdminAndAuditsRejectedMutations() throws Exception {
        String requestId = UUID.randomUUID().toString();
        mvc.perform(post("/api/v1/admin/users/{id}/toggle-block", operator.getId())
                .header("Authorization", adminBearer()).header("X-Request-Id", requestId))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/admin/users/{id}", operator.getId()).header("Authorization", adminBearer()))
                .andExpect(status().isForbidden());
        for (String body : new String[]{"{\"userStatus\":\"DISABLED\"}", "{\"systemRole\":\"USER\"}"}) {
            mvc.perform(put("/api/v1/admin/users/{id}", operator.getId()).header("Authorization", adminBearer())
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        }
        assertThat(users.findById(operator.getId()).orElseThrow().getUserStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(users.findAll().stream().filter(user -> user.getSystemRole() == SystemRole.ADMIN)).hasSize(1);
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM ops.audit_logs WHERE request_id = ? AND actor_id = ?
                AND entity_id = ? AND outcome = 'DENIED'
                """, Integer.class, requestId, operator.getId(), operator.getId())).isEqualTo(1);
    }

    @Test
    void categoryOwnershipAndMetricContracts() throws Exception {
        var personal = categories.saveAndFlush(Category.builder().userId(newUser().getId())
                .name("Personal").kind(EXPENSE).build());
        String systemCode = "SYS_TEST_" + UUID.randomUUID().toString().replace("-", "");
        String body = "{\"name\":\"Test category\",\"kind\":\"EXPENSE\",\"code\":\"" + systemCode + "\"}";
        mvc.perform(put("/api/v1/admin/categories/{id}", personal.getId()).header("Authorization", adminBearer())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/admin/categories/{id}", personal.getId()).header("Authorization", adminBearer()))
                .andExpect(status().isBadRequest());
        assertThat(categories.findById(personal.getId()).orElseThrow().getDeletedAt()).isNull();
        mvc.perform(post("/api/v1/admin/categories").header("Authorization", adminBearer())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/categories").header("Authorization", adminBearer())
                .contentType(MediaType.APPLICATION_JSON).content(body.replace(systemCode, systemCode + "B")))
                .andExpect(status().isBadRequest());
        var id = jdbc.queryForObject("SELECT id FROM core.categories WHERE code = ?", UUID.class, systemCode);
        mvc.perform(put("/api/v1/admin/categories/{id}", id).header("Authorization", adminBearer())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/categories/{id}", id).header("Authorization", adminBearer()))
                .andExpect(status().isNoContent());
        assertThat(categories.findById(id).orElseThrow().getDeletedAt()).isNotNull();
        mvc.perform(get("/api/v1/admin/dashboard/overview").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.transactionsToday").doesNotExist())
                .andExpect(jsonPath("$.transactionActivity").doesNotExist());
        mvc.perform(get("/api/v1/admin/analytics").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.retentionRate").doesNotExist());
    }

    @Test
    void auditSuccessRollsBackWithMutationAndDoesNotStoreUserInput() throws Exception {
        User user = newUser();
        tx.executeWithoutResult(status -> {
            admin.toggleBlockUser(user.getId());
            status.setRollbackOnly();
        });
        assertThat(users.findById(user.getId()).orElseThrow().getUserStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM ops.audit_logs
                WHERE entity_id = ? AND event_type = 'ADMIN_USER_SUSPENDED'
                """, Integer.class, user.getId())).isZero();

        String requestId = UUID.randomUUID().toString();
        mvc.perform(put("/api/v1/admin/users/{id}", user.getId()).header("Authorization", adminBearer())
                .header("X-Request-Id", requestId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"SYNTHETIC_SECRET_DO_NOT_PERSIST\"}")).andExpect(status().isOk());
        String auditRow = jdbc.queryForObject("""
                SELECT to_jsonb(a)::text FROM ops.audit_logs a
                WHERE request_id = ? AND event_type = 'ADMIN_RESOURCE_MUTATION'
                """, String.class, requestId);
        assertThat(auditRow).doesNotContain("SYNTHETIC_SECRET_DO_NOT_PERSIST", "Bearer ");
    }

    @Test
    void inactiveDisabledAndDeletedAccountsCannotResumeSessions() throws Exception {
        for (UserStatus unavailable : new UserStatus[]{UserStatus.INACTIVE, UserStatus.DISABLED, UserStatus.DELETED}) {
            User user = newUser();
            var session = auth.login(login(user), null);
            var mutation = unavailable == UserStatus.DELETED
                    ? delete("/api/v1/admin/users/{id}", user.getId())
                    : put("/api/v1/admin/users/{id}", user.getId()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"userStatus\":\"" + unavailable.name() + "\"}");
            mvc.perform(mutation.header("Authorization", adminBearer())).andExpect(status().isOk());
            mvc.perform(post("/api/v1/admin/users/{id}/toggle-block", user.getId())
                    .header("Authorization", adminBearer()))
                    .andExpect(unavailable == UserStatus.DELETED ? status().isBadRequest() : status().isForbidden());
            assertThatThrownBy(() -> auth.login(login(user), null)).isInstanceOf(InvalidCredentialsException.class);
            assertThatThrownBy(() -> auth.refreshToken(refresh(session.getRefreshToken()), null))
                    .isInstanceOf(InvalidTokenException.class);
            mvc.perform(get("/api/v1/auth/devices").header("Authorization", "Bearer " + session.getAccessToken()))
                    .andExpect(status().isUnauthorized());
        }
    }

    private User newUser() {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test")
                .passwordHash(encoder.encode("phase1-password")).emailVerified(true).build());
    }

    private LoginRequest login(User user) {
        var request = new LoginRequest();
        request.setLogin(user.getEmail());
        request.setPassword("phase1-password");
        return request;
    }

    private RefreshTokenRequest refresh(String token) {
        var request = new RefreshTokenRequest();
        request.setRefreshToken(token);
        return request;
    }

    private String adminBearer() {
        return "Bearer " + jwt.generateAccessToken(operator);
    }
}
