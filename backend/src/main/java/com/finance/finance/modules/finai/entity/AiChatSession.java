package com.finance.finance.modules.finai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_chat_sessions", schema = "core")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AiChatSession {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(nullable = false, length = 255)
    private String title;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @PrePersist void create() { createdAt = updatedAt = Instant.now(); if (title == null) title = "Cuộc trò chuyện mới"; }
}

