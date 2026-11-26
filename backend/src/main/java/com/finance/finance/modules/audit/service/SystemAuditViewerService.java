package com.finance.finance.modules.audit.service;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.dto.SystemAuditViewItem;
import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.model.*;
import com.finance.finance.modules.audit.repository.SystemAuditReadRepository;
import com.finance.finance.modules.audit.sanitizer.AuditDataSanitizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Password-gated viewer for ops.audit_logs.
 * Enforces: (1) Admin authentication, (2) .env secondary password verified in constant time,
 * (3) brute-force rate limiting, (4) short-lived HMAC-signed unlock token bound to adminId,
 * (5) strict pagination (max 50 items/page), and (6) self-auditing of unlock attempts.
 */
@Service
public class SystemAuditViewerService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_SECONDS = 900;
    private static final int MAX_PAGE_SIZE = 50;

    private final SystemAuditReadRepository readRepository;
    private final SystemAuditService systemAuditService;
    private final AuditDataSanitizer sanitizer;
    private final String viewerPassword;
    private final byte[] signingKeyBytes;
    private final long tokenTtlSeconds;

    private final ConcurrentHashMap<UUID, AttemptState> attemptStates = new ConcurrentHashMap<>();

    public SystemAuditViewerService(
            SystemAuditReadRepository readRepository,
            SystemAuditService systemAuditService,
            AuditDataSanitizer sanitizer,
            @Value("${app.audit.viewer.password:}") String viewerPassword,
            @Value("${app.jwt.secret:dev-only-audit-viewer-key-change-me}") String signingSecret,
            @Value("${app.audit.viewer.token-ttl-seconds:600}") long tokenTtlSeconds) {
        this.readRepository = readRepository;
        this.systemAuditService = systemAuditService;
        this.sanitizer = sanitizer;
        this.viewerPassword = viewerPassword != null ? viewerPassword : "";
        this.signingKeyBytes = ("sys-audit-viewer:" + signingSecret).getBytes(StandardCharsets.UTF_8);
        this.tokenTtlSeconds = Math.max(60, Math.min(tokenTtlSeconds, 3600));
    }

    public UnlockResult unlock(UUID adminId, String candidatePassword) {
        if (adminId == null) {
            throw new BusinessException("Không xác định được tài khoản quản trị", "UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
        }
        if (viewerPassword.isBlank()) {
            throw new BusinessException(
                    "Chưa cấu hình SYSTEM_AUDIT_VIEW_PASSWORD trong file .env",
                    "SYSTEM_AUDIT_NOT_CONFIGURED",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }

        long nowEpoch = Instant.now().getEpochSecond();
        AttemptState state = attemptStates.computeIfAbsent(adminId, id -> new AttemptState());
        synchronized (state) {
            if (state.lockedUntilEpoch > nowEpoch) {
                systemAuditService.record(AuditEventRequest.builder()
                        .eventType(AuditEventType.ACCESS_DENIED)
                        .outcome(AuditOutcome.DENIED)
                        .severity(AuditSeverity.HIGH)
                        .actorId(adminId)
                        .actorType(AuditActorType.ADMIN)
                        .source(AuditSource.ADMIN_PORTAL)
                        .reasonCode("SYSTEM_AUDIT_UNLOCK_RATE_LIMITED")
                        .policyOverride(AuditFailurePolicy.MANDATORY_REQUIRES_NEW)
                        .build());
                throw new BusinessException(
                        "Nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.",
                        "SYSTEM_AUDIT_UNLOCK_RATE_LIMITED",
                        HttpStatus.TOO_MANY_REQUESTS);
            }

            if (candidatePassword == null || !constantTimeEquals(candidatePassword, viewerPassword)) {
                state.failures++;
                if (state.failures >= MAX_FAILED_ATTEMPTS) {
                    state.lockedUntilEpoch = nowEpoch + LOCKOUT_SECONDS;
                }
                systemAuditService.record(AuditEventRequest.builder()
                        .eventType(AuditEventType.ACCESS_DENIED)
                        .outcome(AuditOutcome.DENIED)
                        .severity(AuditSeverity.HIGH)
                        .actorId(adminId)
                        .actorType(AuditActorType.ADMIN)
                        .source(AuditSource.ADMIN_PORTAL)
                        .reasonCode("SYSTEM_AUDIT_UNLOCK_FAILED")
                        .metadata(Map.of("failures", state.failures))
                        .policyOverride(AuditFailurePolicy.MANDATORY_REQUIRES_NEW)
                        .build());
                throw new BusinessException(
                        "Mật khẩu Nhật ký hệ thống không chính xác.",
                        "INVALID_SYSTEM_AUDIT_PASSWORD",
                        HttpStatus.UNAUTHORIZED);
            }

            state.failures = 0;
            state.lockedUntilEpoch = 0;
        }

        long expiresAt = nowEpoch + tokenTtlSeconds;
        String token = signToken(adminId, expiresAt);

        systemAuditService.record(AuditEventRequest.builder()
                .eventType(AuditEventType.ADMIN_SYSTEM_AUDIT_UNLOCKED)
                .outcome(AuditOutcome.SUCCESS)
                .severity(AuditSeverity.INFO)
                .actorId(adminId)
                .actorType(AuditActorType.ADMIN)
                .source(AuditSource.ADMIN_PORTAL)
                .resourceType("OPS_AUDIT_LOGS")
                .metadata(Map.of("ttlSeconds", tokenTtlSeconds))
                .policyOverride(AuditFailurePolicy.MANDATORY_REQUIRES_NEW)
                .build());

        return new UnlockResult(token, tokenTtlSeconds, Instant.ofEpochSecond(expiresAt));
    }

    @Transactional(readOnly = true)
    public Page<SystemAuditViewItem> listLogs(
            UUID adminId,
            String unlockToken,
            AuditCategory category,
            AuditOutcome outcome,
            AuditSeverity severity,
            String search,
            int page,
            int size) {
        verifyUnlockToken(adminId, unlockToken);

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        String safeSearch = sanitizer.sanitizeString(search);

        return readRepository.findFiltered(category, outcome, severity, safeSearch, PageRequest.of(safePage, safeSize))
                .map(this::toViewItem);
    }

    public void verifyUnlockToken(UUID adminId, String unlockToken) {
        if (adminId == null || unlockToken == null || unlockToken.isBlank()) {
            throw new BusinessException("Phiên xem Nhật ký hệ thống chưa được mở khóa.", "SYSTEM_AUDIT_LOCKED", HttpStatus.UNAUTHORIZED);
        }
        String[] parts = unlockToken.trim().split("\\.");
        if (parts.length != 4 || !"v1".equals(parts[0])) {
            throw new BusinessException("Token mở khóa Nhật ký hệ thống không hợp lệ.", "SYSTEM_AUDIT_TOKEN_INVALID", HttpStatus.UNAUTHORIZED);
        }
        try {
            UUID tokenAdminId = UUID.fromString(parts[1]);
            long expiresAt = Long.parseLong(parts[2]);
            if (!adminId.equals(tokenAdminId)) {
                throw new BusinessException("Token không khớp tài khoản quản trị.", "SYSTEM_AUDIT_TOKEN_MISMATCH", HttpStatus.FORBIDDEN);
            }
            if (Instant.now().getEpochSecond() > expiresAt) {
                throw new BusinessException("Phiên xem Nhật ký hệ thống đã hết hạn. Vui lòng nhập lại mật khẩu.", "SYSTEM_AUDIT_TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED);
            }
            String payload = parts[0] + "." + parts[1] + "." + parts[2];
            String expectedSig = hmacBase64Url(payload);
            if (!MessageDigest.isEqual(parts[3].getBytes(StandardCharsets.UTF_8), expectedSig.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException("Chữ ký token Nhật ký hệ thống không hợp lệ.", "SYSTEM_AUDIT_TOKEN_TAMPERED", HttpStatus.UNAUTHORIZED);
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("Token mở khóa Nhật ký hệ thống không hợp lệ.", "SYSTEM_AUDIT_TOKEN_INVALID", HttpStatus.UNAUTHORIZED);
        }
    }

    private String signToken(UUID adminId, long expiresAtEpoch) {
        String payload = "v1." + adminId + "." + expiresAtEpoch;
        return payload + "." + hmacBase64Url(payload);
    }

    private String hmacBase64Url(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKeyBytes, "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot sign audit viewer token", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] da = md.digest(a.getBytes(StandardCharsets.UTF_8));
            byte[] db = md.digest(b.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(da, db);
        } catch (Exception ex) {
            return false;
        }
    }

    private SystemAuditViewItem toViewItem(SystemAuditLog log) {
        return SystemAuditViewItem.builder()
                .id(log.getId())
                .occurredAt(log.getOccurredAt())
                .eventType(log.getEventType())
                .eventCategory(log.getEventCategory())
                .action(log.getAction())
                .severity(log.getSeverity())
                .outcome(log.getOutcome())
                .actorId(log.getActorId())
                .actorType(log.getActorType())
                .actorRole(log.getActorRole())
                .subjectUserId(log.getSubjectUserId())
                .source(log.getSource())
                .resourceType(log.getResourceType())
                .resourceId(log.getResourceId())
                .relatedResourceId(log.getRelatedResourceId())
                .groupId(log.getGroupId())
                .requestId(log.getRequestId())
                .correlationId(log.getCorrelationId())
                .httpMethod(log.getHttpMethod())
                .endpoint(log.getEndpoint())
                .changedFields(log.getChangedFields())
                .oldValues(log.getOldValues())
                .newValues(log.getNewValues())
                .metadata(log.getMetadata())
                .reasonCode(log.getReasonCode())
                .errorCode(log.getErrorCode())
                .build();
    }

    public record UnlockResult(String unlockToken, long expiresInSeconds, Instant expiresAt) {
    }

    private static final class AttemptState {
        int failures = 0;
        long lockedUntilEpoch = 0;
    }
}
