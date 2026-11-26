package com.finance.finance.modules.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.model.AuditCategory;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSeverity;
import com.finance.finance.modules.audit.repository.SystemAuditReadRepository;
import com.finance.finance.modules.audit.sanitizer.AuditDataSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SystemAuditViewerServiceTest {

    private SystemAuditReadRepository readRepository;
    private SystemAuditService systemAuditService;
    private AuditDataSanitizer sanitizer;
    private SystemAuditViewerService viewerService;

    @BeforeEach
    void setUp() {
        readRepository = mock(SystemAuditReadRepository.class);
        systemAuditService = mock(SystemAuditService.class);
        sanitizer = new AuditDataSanitizer(new ObjectMapper(), "test-hmac-secret");
        viewerService = new SystemAuditViewerService(
                readRepository,
                systemAuditService,
                sanitizer,
                "SuperSecretEnvPass#2026",
                "jwt-signing-secret-256-bit-test",
                600);
    }

    @Test
    void failClosedWhenEnvPasswordIsNotConfigured() {
        SystemAuditViewerService unconfigured = new SystemAuditViewerService(
                readRepository, systemAuditService, sanitizer, "", "jwt-secret", 600);

        assertThatThrownBy(() -> unconfigured.unlock(UUID.randomUUID(), "anything"))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void locksOutAfterFiveFailedPasswordAttemptsAndRecordsAudit() {
        UUID adminId = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> viewerService.unlock(adminId, "wrong-pass"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("status")
                    .isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        // 6th attempt even with correct password must be rate-limited (429)
        assertThatThrownBy(() -> viewerService.unlock(adminId, "SuperSecretEnvPass#2026"))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

        verify(systemAuditService, atLeast(5)).record(any());
    }

    @Test
    void unlockTokenIsBoundToAdminIdAndValidatesSignature() {
        UUID adminId = UUID.randomUUID();
        UUID otherAdminId = UUID.randomUUID();

        SystemAuditViewerService.UnlockResult result = viewerService.unlock(adminId, "SuperSecretEnvPass#2026");
        assertThat(result.unlockToken()).startsWith("v1.");

        when(readRepository.findFiltered(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(SystemAuditLog.builder()
                        .id(UUID.randomUUID())
                        .occurredAt(Instant.now())
                        .eventType(AuditEventType.TRANSACTION_CREATED)
                        .eventCategory(AuditCategory.TRANSACTION)
                        .action("TRANSACTION_CREATED")
                        .outcome(AuditOutcome.SUCCESS)
                        .severity(AuditSeverity.INFO)
                        .build())));

        // Valid admin succeeds
        assertThat(viewerService.listLogs(adminId, result.unlockToken(), null, null, null, null, 0, 20).getContent())
                .hasSize(1);

        // Different adminId rejected
        assertThatThrownBy(() -> viewerService.listLogs(otherAdminId, result.unlockToken(), null, null, null, null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.FORBIDDEN);

        // Tampered token rejected
        assertThatThrownBy(() -> viewerService.listLogs(adminId, result.unlockToken() + "tamper", null, null, null, null, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
