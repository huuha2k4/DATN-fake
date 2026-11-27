package com.finance.finance.modules.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.admin.dto.request.AdminPaging;
import com.finance.finance.modules.admin.service.AdminBroadcastService;
import com.finance.finance.modules.admin.service.AdminService;
import com.finance.finance.modules.audit.context.RequestContextFilter;
import com.finance.finance.modules.auth.dto.request.GoogleAuthRequest;
import com.finance.finance.modules.auth.dto.request.LoginRequest;
import com.finance.finance.modules.auth.dto.request.RefreshTokenRequest;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import io.jsonwebtoken.Jwts;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.doReturn;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.admin.broadcast-worker-enabled=false")
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "finora_phase1")
@Transactional
class AdminPhaseTwoIntegrationTest {
    @Autowired WebApplicationContext web;
    @Autowired RequestContextFilter requestContext;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider jwt;
    @Autowired PasswordEncoder encoder;
    @Autowired AdminService admin;
    @Autowired AdminBroadcastService broadcasts;
    @Autowired EntityManagerFactory emf;
    @jakarta.persistence.PersistenceContext jakarta.persistence.EntityManager em;
    @MockitoSpyBean AuthService auth;
    private MockMvc mvc;
    private String adminBearer;

    @BeforeEach
    void setUp() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("finora_phase1");
        mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build();
        UUID adminId = jdbc.queryForObject("""
                SELECT id FROM core.users WHERE system_role = 'ADMIN' AND deleted_at IS NULL
                """, UUID.class);
        adminBearer = bearer(users.findById(adminId).orElseThrow());
    }

    @Test
    void paginatesAndFiltersAtThreeDatasetSizes() throws Exception {
        var statistics = emf.unwrap(SessionFactory.class).getStatistics();
        boolean previous = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        try {
            int seeded = 0;
            long existingSessions = jdbc.queryForObject("""
                    SELECT count(*) FROM core.ai_chat_sessions s JOIN core.users u ON u.id = s.user_id
                    WHERE u.deleted_at IS NULL
                    """, Long.class);
            for (int size : new int[]{100, 1000, 10000}) {
                jdbc.update("""
                        INSERT INTO core.users(email, full_name, created_at)
                        SELECT 'phase2-bench-' || i || '@example.test', 'Phase 2 benchmark', now()
                        FROM generate_series(?, ?) i
                        """, seeded + 1, size);
                jdbc.update("""
                        INSERT INTO core.receipts(user_id, merchant_name, needs_review)
                        SELECT id, 'Phase 2 benchmark', true FROM core.users
                        WHERE email LIKE 'phase2-bench-%'
                        AND NOT EXISTS (SELECT 1 FROM core.receipts r WHERE r.user_id = users.id)
                        """);
                jdbc.update("""
                        INSERT INTO core.ai_chat_sessions(user_id)
                        SELECT id FROM core.users WHERE email LIKE 'phase2-bench-%'
                        AND NOT EXISTS (SELECT 1 FROM core.ai_chat_sessions s WHERE s.user_id = users.id)
                        """);
                jdbc.update("""
                        INSERT INTO core.broadcast_campaigns(id,title,body,audience,priority,expected_count,status)
                        SELECT gen_random_uuid(), 'Phase 2 benchmark', 'Fixture', 'ALL', 'NORMAL', 0, 'COMPLETED'
                        FROM generate_series(?, ?)
                        """, seeded + 1, size);
                jdbc.update("""
                        INSERT INTO core.feedbacks(title, content, status, category)
                        SELECT 'Phase 2 benchmark', 'Fixture', 'IN_PROGRESS', 'GENERAL'
                        FROM generate_series(?, ?)
                        """, seeded + 1, size);
                jdbc.update("""
                        INSERT INTO core.audit_logs(admin_username, action, target_entity, description)
                        SELECT 'phase2-bench', 'LEGACY_TEST', 'USER', 'Fixture' FROM generate_series(?, ?)
                        """, seeded + 1, size);
                seeded = size;
                if (size == 10000) {
                    for (String line : jdbc.queryForList("""
                            EXPLAIN (ANALYZE, BUFFERS)
                            SELECT r.id FROM core.receipts r WHERE r.needs_review
                            ORDER BY r.created_at, r.id LIMIT 10
                            """, String.class)) {
                        System.out.println("PHASE2_PLAN " + line);
                    }
                }
                String[] paths = {
                        "/users?search=phase2-bench&status=ACTIVE&tier=FREE",
                        "/ocr/receipts?review=true",
                        "/feedbacks?search=Phase%202%20benchmark&status=IN_PROGRESS&category=GENERAL",
                        "/audit-logs?search=phase2-bench&action=LEGACY_TEST&targetEntity=USER",
                        "/ai/sessions?unused=1",
                        "/broadcast?search=Phase%202%20benchmark"
                };
                statistics.clear();
                long start = System.nanoTime();
                var baseline = users.findAll();
                long baselineMs = (System.nanoTime() - start) / 1_000_000;
                long baselineQueries = statistics.getPrepareStatementCount();
                long baselineLoads = statistics.getEntityLoadCount();
                assertThat(baseline).hasSizeGreaterThanOrEqualTo(size);
                em.clear();
                for (String path : paths) {
                    long total = path.startsWith("/ai/sessions") ? size + existingSessions : size;
                    statistics.clear();
                    start = System.nanoTime();
                    if ("true".equals(System.getenv("FINORA_PHASE2_SQL_TRACE"))) {
                        jdbc.execute("SET LOCAL log_statement = 'all'");
                        jdbc.queryForObject("SELECT ?::text", String.class, "PHASE2_SQL_BEGIN_" + size + "_" + path.split("[?]")[0]);
                    }
                    var response = mvc.perform(get(java.net.URI.create("/api/v1/admin" + path + "&size=10&sort=oldest"))
                                    .header("Authorization", adminBearer)).andExpect(status().isOk())
                            .andExpect(jsonPath("$.content.length()").value(10))
                            .andExpect(jsonPath("$.totalElements").value(total))
                            .andExpect(jsonPath("$.totalPages").value((total + 9) / 10))
                            .andReturn().getResponse();
                    if ("true".equals(System.getenv("FINORA_PHASE2_SQL_TRACE"))) {
                        jdbc.queryForObject("SELECT 'PHASE2_SQL_END'::text", String.class);
                        jdbc.execute("SET LOCAL log_statement = 'none'");
                    }
                    assertThat(statistics.getEntityLoadCount()).isLessThanOrEqualTo(11);
                    System.out.printf("PHASE2_BENCH n=%d endpoint=%s ms=%.2f bytes=%d ormQueries=%d entityLoads=%d%n",
                            size, path.split("[?]")[0], (System.nanoTime()-start)/1_000_000.0,
                            response.getContentAsByteArray().length, statistics.getPrepareStatementCount(),
                            statistics.getEntityLoadCount());
                }
                System.out.printf("PHASE2_BASELINE n=%d userFindAllMs=%d queries=%d entityLoads=%d%n",
                        size, baselineMs, baselineQueries, baselineLoads);
            }
            var first = admin.listUsers("phase2-bench", null, null, new AdminPaging(0, 10, "oldest"));
            var second = admin.listUsers("phase2-bench", null, null, new AdminPaging(1, 10, "oldest"));
            assertThat(first.content()).extracting(u -> u.id())
                    .doesNotContainAnyElementsOf(second.content().stream().map(u -> u.id()).toList());
            mvc.perform(get("/api/v1/admin/users?size=101").header("Authorization", adminBearer))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/v1/admin/users?sort=passwordHash").header("Authorization", adminBearer))
                    .andExpect(status().isBadRequest());
        } finally {
            statistics.setStatisticsEnabled(previous);
        }
    }

    @Test
    void appliesMaintenanceToPasswordGoogleRefreshAndJwtButLetsAdminTurnItOff() throws Exception {
        User person = ordinaryUser();
        var login = new LoginRequest();
        login.setLogin(person.getEmail());
        login.setPassword("phase2-user-fixture");
        var session = auth.login(login, null);
        var refresh = new RefreshTokenRequest();
        refresh.setRefreshToken(session.getRefreshToken());
        var payload = new GoogleIdToken.Payload();
        payload.setEmail(person.getEmail());
        payload.setSubject(person.getId().toString());
        payload.setEmailVerified(true);
        doReturn(payload).when(auth).verifyGoogleIdToken("phase2-google-fixture");
        var google = new GoogleAuthRequest();
        google.setIdToken("phase2-google-fixture");

        setting("MAINTENANCE_MODE", "on").andExpect(status().isBadRequest());
        setting("FREE_TIER_MAX_WALLETS", "1001").andExpect(status().isBadRequest());
        setting("JWT_SECRET", "some-value").andExpect(status().isBadRequest());
        setting("AI_RESPONSE_TEMPERATURE", "0.5").andExpect(status().isBadRequest());
        setting("MAINTENANCE_MODE", "true").andExpect(status().isOk());
        for (var authCall : java.util.List.<org.assertj.core.api.ThrowableAssert.ThrowingCallable>of(
                () -> auth.login(login, null), () -> auth.refreshToken(refresh, null),
                () -> auth.authenticateWithGoogle(google, null))) {
            assertThatThrownBy(authCall).isInstanceOf(BusinessException.class)
                    .extracting("status").isEqualTo(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE);
        }
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", "Bearer " + session.getAccessToken()))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.errorCode").value("MAINTENANCE_MODE"));
        setting("MAINTENANCE_MODE", "false").andExpect(status().isOk());
        assertThat(auth.refreshToken(refresh, null).getAccessToken()).isNotBlank();
    }

    @Test
    void legacyJwtWorksUntilSuspensionAndUserUpdateRejectsUnknownFields() throws Exception {
        var person = ordinaryUser();
        String token = "Bearer " + Jwts.builder().subject(person.getId().toString())
                .issuer((String) ReflectionTestUtils.getField(jwt, "issuer"))
                .expiration(Date.from(Instant.now().plusSeconds(600)))
                .signWith((SecretKey) ReflectionTestUtils.getField(jwt, "secretKey")).compact();
        mvc.perform(get("/api/v1/auth/devices").header("Authorization", token)).andExpect(status().isOk());
        mvc.perform(put("/api/v1/admin/users/{id}", person.getId()).header("Authorization", adminBearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"passwordHash\":\"forbidden\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/admin/users/{id}", person.getId()).header("Authorization", adminBearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"subscriptionTier\":\"PREMIUM\"}"))
                .andExpect(status().isBadRequest());
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/v1/admin/users/{id}/toggle-block", person.getId())
                    .header("Authorization", adminBearer)).andExpect(status().isOk());
            mvc.perform(get("/api/v1/auth/devices").header("Authorization", token)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void feedbackTransitionIsVisibleToUserAndRetryCreatesOneNotification() throws Exception {
        var person = ordinaryUser();
        UUID id = jdbc.queryForObject("""
                INSERT INTO core.feedbacks(user_id, title, content) VALUES (?, 'Phase 2 feedback', 'Synthetic')
                RETURNING id
                """, UUID.class, person.getId());
        String updated = jdbc.queryForObject("SELECT updated_at FROM core.feedbacks WHERE id = ?",
                (rs,n) -> rs.getTimestamp(1).toInstant().toString(), id);
        UUID request = UUID.randomUUID();
        String reply = "Đã xử lý yêu cầu thử nghiệm";
        String body = json.writeValueAsString(Map.of("status", "RESOLVED", "reply", reply, "expectedUpdatedAt", updated));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/v1/admin/feedbacks/{id}/reply", id).header("Authorization", adminBearer)
                    .header("Idempotency-Key", request).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.processedBy").isNotEmpty());
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM core.feedback_history WHERE feedback_id = ?", Long.class, id))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM core.notifications WHERE user_id = ?", Long.class, person.getId()))
                .isEqualTo(1);
        mvc.perform(get("/api/v1/feedbacks/my").header("Authorization", bearer(person)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].adminReply").value(reply));
        mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(person)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.notifications.length()").value(1));
        String latest = jdbc.queryForObject("SELECT updated_at FROM core.feedbacks WHERE id = ?",
                (rs,n) -> rs.getTimestamp(1).toInstant().toString(), id);
        String invalid = json.writeValueAsString(Map.of("status", "IN_PROGRESS", "expectedUpdatedAt", latest));
        mvc.perform(post("/api/v1/admin/feedbacks/{id}/reply", id).header("Authorization", adminBearer)
                .header("Idempotency-Key", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
    }

    @Test
    void campaignIdentityAndBatchReplayAndReadOnlyTemplate() throws Exception {
        var recipient = ordinaryUser();
        jdbc.update("""
                INSERT INTO core.users(email) SELECT 'phase2-broadcast-' || i || '@example.test'
                FROM generate_series(1, 507) i
                """);
        String body = "{\"title\":\"Same Phase 2 title\",\"body\":\"Synthetic broadcast\",\"targetAudience\":\"FREE_ONLY\"}";
        var first = UUID.randomUUID();
        var second = UUID.randomUUID();
        for (UUID request : new UUID[]{first, first, second}) {
            mvc.perform(post("/api/v1/admin/broadcast").header("Authorization", adminBearer)
                    .header("Idempotency-Key", request).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isAccepted()).andExpect(jsonPath("$.id").value(request.toString()));
        }
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM core.notifications WHERE broadcast_campaign_id IN (?, ?)
                """, Long.class, first, second)).isZero();
        broadcasts.dispatchBatch();
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM core.notifications WHERE broadcast_campaign_id IN (?, ?)
                """, Long.class, first, second)).isEqualTo(500);
        for (int i = 0; i < 4; i++) broadcasts.dispatchBatch();
        mvc.perform(get(java.net.URI.create("/api/v1/admin/broadcast?search=Same%20Phase%202%20title"))
                .header("Authorization", adminBearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].status").value("COMPLETED"));
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM core.notifications WHERE user_id = ? AND broadcast_campaign_id IN (?, ?)
                """, Long.class, recipient.getId(), first, second)).isEqualTo(2);
        String sql = "SELECT row_to_json(t)::text FROM core.notification_templates t WHERE code = 'AUTO_DAILY_20PM_NO_TX'";
        String before = jdbc.queryForObject(sql, String.class);
        mvc.perform(get("/api/v1/admin/notification-templates").header("Authorization", adminBearer))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject(sql, String.class)).isEqualTo(before);
    }

    @Test
    void dashboardUsesVietnameseMidnightAndExcludesSoftDeletes() throws Exception {
        var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        long before = admin.getDashboardOverview().getNewUsersToday();
        var boundary = today.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        jdbc.update("""
                INSERT INTO core.users(email, created_at, deleted_at) VALUES
                ('phase2-boundary-today@example.test', ?, null),
                ('phase2-boundary-tomorrow@example.test', ?, null),
                ('phase2-boundary-deleted@example.test', ?, now())
                """, boundary, boundary.plusDays(1), boundary);
        assertThat(admin.getDashboardOverview().getNewUsersToday()).isEqualTo(before + 1);
        assertThat(admin.getAnalyticsOverview().getActivityTrend().getLast().getDate()).isEqualTo(today.toString());
    }

    private org.springframework.test.web.servlet.ResultActions setting(String key, String value) throws Exception {
        return mvc.perform(put("/api/v1/admin/settings/{key}", key).header("Authorization", adminBearer)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("value", value))));
    }

    private User ordinaryUser() {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test")
                .passwordHash(encoder.encode("phase2-user-fixture")).emailVerified(true).build());
    }

    private String bearer(User user) {
        return "Bearer " + jwt.generateAccessToken(user);
    }
}
