package com.finance.finance.modules.finai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "finai_pending_actions", schema = "core")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiPendingAction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(name = "conversation_id")
    private UUID conversationId;
    @Column(name = "plan_id")
    private UUID planId;
    @Column(name = "tool_name", nullable = false, length = 100)
    private String toolName;
    @Column(name = "arguments_json", nullable = false, columnDefinition = "TEXT")
    private String argumentsJson;
    @Column(name = "preview_json", nullable = false, columnDefinition = "TEXT")
    private String previewJson;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FinAiActionStatus status;
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "confirmed_at")
    private Instant confirmedAt;
    @Column(name = "executed_at")
    private Instant executedAt;
    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;
    @Column(columnDefinition = "TEXT")
    private String error;
    @Version
    private long version;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = FinAiActionStatus.PENDING;
    }
}

