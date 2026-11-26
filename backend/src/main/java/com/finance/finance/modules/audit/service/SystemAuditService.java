package com.finance.finance.modules.audit.service;

import com.finance.finance.modules.audit.context.AuditContext;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import com.finance.finance.modules.audit.entity.SystemAuditLog;
import com.finance.finance.modules.audit.model.*;
import com.finance.finance.modules.audit.repository.SystemAuditLogRepository;
import com.finance.finance.modules.audit.sanitizer.AuditDataSanitizer;
import com.finance.finance.modules.user.entity.User;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Centralized System Audit Log recording service for ops.audit_logs.
 */
@Slf4j
@Service
public class SystemAuditService {

    private final SystemAuditLogRepository repository;
    private final SystemAuditPersistenceHelper persistenceHelper;
    private final AuditDataSanitizer sanitizer;
    private final ObjectProvider<MeterRegistry> meterRegistryProvider;

    public SystemAuditService(
            SystemAuditLogRepository repository,
            SystemAuditPersistenceHelper persistenceHelper,
            AuditDataSanitizer sanitizer,
            ObjectProvider<MeterRegistry> meterRegistryProvider) {
        this.repository = repository;
        this.persistenceHelper = persistenceHelper;
        this.sanitizer = sanitizer;
        this.meterRegistryProvider = meterRegistryProvider;
    }

    public void record(AuditEventRequest req) {
        if (req == null || req.getEventType() == null) {
            throw new IllegalArgumentException("AuditEventRequest and eventType must not be null");
        }

        Timer.Sample timerSample = startTimer();
        AuditEventType eventType = req.getEventType();
        AuditOutcome outcome = req.getOutcome() != null ? req.getOutcome() : AuditOutcome.SUCCESS;
        AuditSeverity severity = req.getSeverity() != null ? req.getSeverity() : AuditSeverity.INFO;
        AuditFailurePolicy policy = req.getPolicyOverride() != null
                ? req.getPolicyOverride()
                : resolveEffectivePolicy(eventType, outcome);

        try {
            if (req.getEventId() != null && repository.existsByEventId(req.getEventId())) {
                incrementCounter("audit_duplicate_events_total", eventType.getCategory().name(), outcome.name());
                return;
            }

            AuditContext ctx = AuditContextHolder.get();
            ResolvedActor actor = resolveActor(req, ctx);

            Map<String, Object> oldValues = safeSanitizeMap(req.getOldValues(), req.getAllowlistedKeys(), eventType);
            Map<String, Object> newValues = safeSanitizeMap(req.getNewValues(), req.getAllowlistedKeys(), eventType);
            Map<String, Object> metadata = safeSanitizeMap(req.getMetadata(), req.getAllowlistedKeys(), eventType);
            Map<String, Object> changedFieldsMap = buildChangedFieldsMap(req.getChangedFields());

            String requestId = ctx != null ? ctx.getRequestId() : null;
            String correlationId = req.getCorrelationId() != null
                    ? sanitizer.sanitizeCode(req.getCorrelationId())
                    : (ctx != null ? ctx.getCorrelationId() : null);

            SystemAuditLog entity = SystemAuditLog.builder()
                    .eventId(req.getEventId())
                    .occurredAt(Instant.now())
                    .eventType(eventType)
                    .eventCategory(eventType.getCategory())
                    .action(eventType.name())
                    .severity(severity)
                    .outcome(outcome)
                    .userId(actor.actorId())
                    .actorId(actor.actorId())
                    .actorType(actor.actorType())
                    .actorRole(actor.actorRole())
                    .subjectUserId(req.getSubjectUserId() != null ? req.getSubjectUserId() : actor.actorId())
                    .source(resolveSource(req, ctx))
                    .resourceType(sanitizer.sanitizeCode(req.getResourceType()))
                    .resourceId(req.getResourceId())
                    .relatedResourceId(req.getRelatedResourceId())
                    .groupId(req.getGroupId())
                    .requestId(requestId)
                    .correlationId(correlationId)
                    .ipAddress(ctx != null ? ctx.getIpAddress() : null)
                    .userAgent(ctx != null ? ctx.getUserAgent() : null)
                    .httpMethod(ctx != null ? ctx.getHttpMethod() : null)
                    .endpoint(ctx != null ? ctx.getEndpoint() : null)
                    .changedFields(changedFieldsMap)
                    .oldValues(oldValues)
                    .newValues(newValues)
                    .metadata(metadata)
                    .reasonCode(sanitizer.sanitizeCode(req.getReasonCode()))
                    .errorCode(sanitizer.sanitizeCode(req.getErrorCode()))
                    .build();

            if (policy == AuditFailurePolicy.MANDATORY_REQUIRES_NEW) {
                persistenceHelper.saveInNewTransaction(entity);
            } else {
                persistenceHelper.saveInCurrentTransaction(entity);
            }

            incrementCounter("audit_events_total", eventType.getCategory().name(), outcome.name());
            if (eventType.getCategory() == AuditCategory.SECURITY || outcome == AuditOutcome.DENIED) {
                incrementCounter("audit_security_events_total", eventType.getCategory().name(), outcome.name());
            }
            if (outcome == AuditOutcome.DENIED) {
                incrementCounter("audit_denied_events_total", eventType.getCategory().name(), severity.name());
            }
        } catch (RuntimeException ex) {
            incrementCounter("audit_events_failed_total", eventType.getCategory().name(), policy.name());
            log.error("SystemAuditService failed for eventType={}, outcome={}, policy={}: {}",
                    eventType, outcome, policy, ex.getMessage());
            if (policy == AuditFailurePolicy.MANDATORY_FAIL_CLOSED) {
                throw ex;
            }
            // MANDATORY_REQUIRES_NEW (for security/failure events): log error but do not mask security/auth response.
            // OPTIONAL_FAIL_OPEN: degrade gracefully with metric + warning log.
        } finally {
            stopTimer(timerSample, eventType.getCategory().name());
        }
    }

    public void recordSimple(AuditEventType eventType, String resourceType, UUID resourceId, Map<String, Object> metadata) {
        record(AuditEventRequest.builder()
                .eventType(eventType)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .metadata(metadata)
                .build());
    }

    public void recordDenied(AuditEventType eventType, String resourceType, UUID resourceId, String reasonCode) {
        record(AuditEventRequest.builder()
                .eventType(eventType)
                .outcome(AuditOutcome.DENIED)
                .severity(AuditSeverity.HIGH)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .reasonCode(reasonCode)
                .policyOverride(AuditFailurePolicy.MANDATORY_REQUIRES_NEW)
                .build());
    }

    private AuditFailurePolicy resolveEffectivePolicy(AuditEventType eventType, AuditOutcome outcome) {
        if (outcome == AuditOutcome.FAILURE || outcome == AuditOutcome.DENIED || outcome == AuditOutcome.REJECTED) {
            return AuditFailurePolicy.MANDATORY_REQUIRES_NEW;
        }
        return eventType.getDefaultPolicy();
    }

    private ResolvedActor resolveActor(AuditEventRequest req, AuditContext ctx) {
        if (req.getActorType() == AuditActorType.SYSTEM || req.getActorType() == AuditActorType.SERVICE) {
            return new ResolvedActor(req.getActorId(), req.getActorType(), sanitizer.sanitizeCode(req.getActorRole()));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User user) {
            String role = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .findFirst()
                    .orElse(user.getSystemRole() != null ? "ROLE_" + user.getSystemRole().name() : "ROLE_USER");
            AuditActorType type = "ROLE_ADMIN".equalsIgnoreCase(role) ? AuditActorType.ADMIN : AuditActorType.USER;
            if (req.getActorType() != null && req.getActorType() != AuditActorType.ANONYMOUS) {
                type = req.getActorType();
            }
            return new ResolvedActor(user.getId(), type, sanitizer.sanitizeCode(role));
        }

        if (req.getActorId() != null) {
            AuditActorType type = req.getActorType() != null ? req.getActorType() : AuditActorType.USER;
            return new ResolvedActor(req.getActorId(), type, sanitizer.sanitizeCode(req.getActorRole()));
        }

        if (ctx != null && ctx.getActorId() != null) {
            return new ResolvedActor(ctx.getActorId(),
                    ctx.getActorType() != null ? ctx.getActorType() : AuditActorType.USER,
                    ctx.getActorRole());
        }

        return new ResolvedActor(null, AuditActorType.ANONYMOUS, null);
    }

    private AuditSource resolveSource(AuditEventRequest req, AuditContext ctx) {
        if (req.getSource() != null) {
            return req.getSource();
        }
        if (ctx != null && ctx.getSource() != null) {
            return ctx.getSource();
        }
        return AuditSource.UNKNOWN;
    }

    private Map<String, Object> safeSanitizeMap(Map<String, Object> raw, Set<String> allowlist, AuditEventType eventType) {
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        try {
            return sanitizer.sanitizeMap(raw, allowlist);
        } catch (IllegalArgumentException ex) {
            incrementCounter("audit_payload_rejected_total", eventType.getCategory().name(), "OVERSIZED");
            throw ex;
        }
    }

    private Map<String, Object> buildChangedFieldsMap(List<String> fields) {
        if (fields == null || fields.isEmpty()) {
            return null;
        }
        List<String> sanitized = new ArrayList<>();
        for (String f : fields) {
            String clean = sanitizer.sanitizeCode(f);
            if (clean != null && !sanitizer.isForbiddenKey(clean)) {
                sanitized.add(clean);
            }
        }
        if (sanitized.isEmpty()) {
            return null;
        }
        return Map.of("fields", sanitized);
    }

    private Timer.Sample startTimer() {
        MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        return registry != null ? Timer.start(registry) : null;
    }

    private void stopTimer(Timer.Sample sample, String category) {
        if (sample == null) return;
        MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            sample.stop(Timer.builder("audit_persistence_duration")
                    .tag("category", category)
                    .register(registry));
        }
    }

    private void incrementCounter(String name, String tag1, String tag2) {
        MeterRegistry registry = meterRegistryProvider.getIfAvailable();
        if (registry != null) {
            registry.counter(name, "category", tag1, "detail", tag2).increment();
        }
    }

    private record ResolvedActor(UUID actorId, AuditActorType actorType, String actorRole) {
    }
}
