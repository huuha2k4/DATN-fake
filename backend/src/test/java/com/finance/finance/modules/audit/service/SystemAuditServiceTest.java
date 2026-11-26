package com.finance.finance.modules.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.model.*;
import com.finance.finance.modules.audit.repository.SystemAuditLogRepository;
import com.finance.finance.modules.audit.sanitizer.AuditDataSanitizer;
import com.finance.finance.modules.user.entity.User;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SystemAuditServiceTest {

    private SystemAuditLogRepository repository;
    private SystemAuditPersistenceHelper persistenceHelper;
    private SimpleMeterRegistry meterRegistry;
    private SystemAuditService service;

    @BeforeEach
    void setUp() {
        repository = mock(SystemAuditLogRepository.class);
        persistenceHelper = mock(SystemAuditPersistenceHelper.class);
        when(persistenceHelper.saveInCurrentTransaction(any())).thenAnswer(inv -> inv.getArgument(0));
        when(persistenceHelper.saveInNewTransaction(any())).thenAnswer(inv -> inv.getArgument(0));

        meterRegistry = new SimpleMeterRegistry();
        StaticListableBeanFactory beanFactory = new StaticListableBeanFactory();
        beanFactory.addBean("meterRegistry", meterRegistry);

        AuditDataSanitizer sanitizer = new AuditDataSanitizer(new ObjectMapper(), "test-secret");
        service = new SystemAuditService(repository, persistenceHelper, sanitizer,
                beanFactory.getBeanProvider(io.micrometer.core.instrument.MeterRegistry.class));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        AuditContextHolder.clear();
    }

    @Test
    void resolvesAuthenticatedActorFromSecurityContextOverSpoofedActorId() {
        UUID realUserId = UUID.randomUUID();
        UUID spoofedUserId = UUID.randomUUID();
        User principal = User.builder().id(realUserId).systemRole(SystemRole.USER).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );

        service.record(AuditEventRequest.builder()
                .eventType(AuditEventType.TRANSACTION_CREATED)
                .actorId(spoofedUserId)
                .resourceType("TRANSACTION")
                .resourceId(UUID.randomUUID())
                .newValues(Map.of("amount", 10000))
                .build());

        var captor = org.mockito.ArgumentCaptor.forClass(SystemAuditLog.class);
        verify(persistenceHelper).saveInCurrentTransaction(captor.capture());
        assertThat(captor.getValue().getActorId()).isEqualTo(realUserId);
        assertThat(captor.getValue().getActorType()).isEqualTo(AuditActorType.USER);
    }

    @Test
    void mandatoryFailClosedPropagatesPersistenceFailureToRollbackFinancialTx() {
        when(persistenceHelper.saveInCurrentTransaction(any())).thenThrow(new RuntimeException("DB down"));

        assertThatThrownBy(() -> service.record(AuditEventRequest.builder()
                .eventType(AuditEventType.TRANSACTION_CREATED)
                .outcome(AuditOutcome.SUCCESS)
                .resourceType("TRANSACTION")
                .resourceId(UUID.randomUUID())
                .build()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB down");

        assertThat(meterRegistry.counter("audit_events_failed_total", "category", "TRANSACTION", "detail", "MANDATORY_FAIL_CLOSED").count())
                .isEqualTo(1.0);
    }

    @Test
    void failureAndDeniedEventsUseRequiresNewAndDoNotMaskSecurityResponse() {
        when(persistenceHelper.saveInNewTransaction(any())).thenThrow(new RuntimeException("DB down"));

        // Must NOT throw for security/failure event so original 401/403 response is preserved
        service.recordDenied(AuditEventType.ACCESS_DENIED, "ACCOUNT", UUID.randomUUID(), "OWNERSHIP_VIOLATION");

        verify(persistenceHelper).saveInNewTransaction(any());
        verify(persistenceHelper, never()).saveInCurrentTransaction(any());
    }

    @Test
    void skipsDuplicateEventIdForIdempotency() {
        UUID eventId = UUID.randomUUID();
        when(repository.existsByEventId(eventId)).thenReturn(true);

        service.record(AuditEventRequest.builder()
                .eventId(eventId)
                .eventType(AuditEventType.RECURRING_TRANSACTION_EXECUTED)
                .actorType(AuditActorType.SYSTEM)
                .build());

        verify(persistenceHelper, never()).saveInCurrentTransaction(any());
        verify(persistenceHelper, never()).saveInNewTransaction(any());
        assertThat(meterRegistry.counter("audit_duplicate_events_total", "category", "SCHEDULE", "detail", "SUCCESS").count())
                .isEqualTo(1.0);
    }

    @Test
    void repositoryIsStrictlyAppendOnlyWithoutDeleteOrFindAll() {
        List<String> methodNames = Arrays.stream(SystemAuditLogRepository.class.getMethods())
                .map(Method::getName)
                .toList();
        assertThat(methodNames).containsExactlyInAnyOrder("save", "existsByEventId", "count");
        assertThat(methodNames).doesNotContain("delete", "deleteById", "deleteAll", "findAll");
    }
}
