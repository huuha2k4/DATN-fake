package com.finance.finance.modules.audit.service;

import com.finance.finance.modules.audit.model.*;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Value
@Builder
public class AuditEventRequest {
    UUID eventId;
    AuditEventType eventType;
    @Builder.Default
    AuditOutcome outcome = AuditOutcome.SUCCESS;
    @Builder.Default
    AuditSeverity severity = AuditSeverity.INFO;

    // Optional explicit overrides (resolved from SecurityContext / AuditContextHolder when null)
    UUID actorId;
    AuditActorType actorType;
    String actorRole;
    UUID subjectUserId;
    AuditSource source;
    String correlationId;

    String resourceType;
    UUID resourceId;
    UUID relatedResourceId;
    UUID groupId;

    List<String> changedFields;
    Map<String, Object> oldValues;
    Map<String, Object> newValues;
    Map<String, Object> metadata;
    Set<String> allowlistedKeys;

    String reasonCode;
    String errorCode;
    AuditFailurePolicy policyOverride;
}
