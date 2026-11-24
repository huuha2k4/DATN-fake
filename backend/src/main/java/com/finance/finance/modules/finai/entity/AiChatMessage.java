package com.finance.finance.modules.finai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_chat_messages", schema = "core")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AiChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;
    @Column(nullable = false, length = 20)
    private String author;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;
    @Column(length = 50)
    private String kind;
    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); if (kind == null) kind = "normal"; }
}
