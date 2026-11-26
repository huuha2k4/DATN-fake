package com.finance.finance.modules.audit.entity;

import com.finance.finance.modules.audit.model.AuditActorType;
import com.finance.finance.modules.audit.model.AuditCategory;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSeverity;
import com.finance.finance.modules.audit.model.AuditSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Append-only system security & business audit log persisted in ops.audit_logs.
 */
@Entity
@Table(name = "audit_logs", schema = "ops")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class SystemAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 100, updatable = false)
    private AuditEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_category", nullable = false, length = 50, updatable = false)
    private AuditCategory eventCategory;

    @Column(name = "action", nullable = false, length = 100, updatable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20, updatable = false)
    @Builder.Default
    private AuditSeverity severity = AuditSeverity.INFO;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20, updatable = false)
    @Builder.Default
    private AuditOutcome outcome = AuditOutcome.SUCCESS;

    @Column(name = "user_id", updatable = false)
    private UUID userId;

    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 30, updatable = false)
    @Builder.Default
    private AuditActorType actorType = AuditActorType.SYSTEM;

    @Column(name = "actor_role", length = 50, updatable = false)
    private String actorRole;

    @Column(name = "subject_user_id", updatable = false)
    private UUID subjectUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30, updatable = false)
    @Builder.Default
    private AuditSource source = AuditSource.UNKNOWN;

    @Column(name = "entity_type", length = 100, updatable = false)
    private String resourceType;

    @Column(name = "entity_id", updatable = false)
    private UUID resourceId;

    @Column(name = "related_resource_id", updatable = false)
    private UUID relatedResourceId;

    @Column(name = "group_id", updatable = false)
    private UUID groupId;

    @Column(name = "request_id", length = 64, updatable = false)
    private String requestId;

    @Column(name = "correlation_id", length = 64, updatable = false)
    private String correlationId;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT", updatable = false)
    private String userAgent;

    @Column(name = "http_method", length = 10, updatable = false)
    private String httpMethod;

    @Column(name = "endpoint", length = 200, updatable = false)
    private String endpoint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "changed_fields", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> changedFields;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_values", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> oldValues;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_values", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> newValues;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> metadata;

    @Column(name = "reason_code", length = 100, updatable = false)
    private String reasonCode;

    @Column(name = "error_code", length = 100, updatable = false)
    private String errorCode;
}
