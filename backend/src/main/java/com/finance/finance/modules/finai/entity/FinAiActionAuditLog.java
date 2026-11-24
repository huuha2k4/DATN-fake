package com.finance.finance.modules.finai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "finai_action_audit_logs", schema = "core")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiActionAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "action_id", nullable = false)
    private UUID actionId;
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(name = "tool_name", nullable = false, length = 100)
    private String toolName;
    @Column(nullable = false, length = 50)
    private String event;
    @Column(nullable = false, length = 30)
    private String status;
    @Column(columnDefinition = "TEXT")
    private String detail;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() { if (createdAt == null) createdAt = Instant.now(); }
}

