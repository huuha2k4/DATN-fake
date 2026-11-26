package com.finance.finance.modules.audit.dto;

import com.finance.finance.modules.audit.model.*;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Value
@Builder
public class SystemAuditViewItem {
    UUID id;
    Instant occurredAt;
    AuditEventType eventType;
    AuditCategory eventCategory;
    String action;
    AuditSeverity severity;
    AuditOutcome outcome;
    UUID actorId;
    AuditActorType actorType;
    String actorRole;
    UUID subjectUserId;
    AuditSource source;
    String resourceType;
    UUID resourceId;
    UUID relatedResourceId;
    UUID groupId;
    String requestId;
    String correlationId;
    String httpMethod;
    String endpoint;
    Map<String, Object> changedFields;
    Map<String, Object> oldValues;
    Map<String, Object> newValues;
    Map<String, Object> metadata;
    String reasonCode;
    String errorCode;
}
