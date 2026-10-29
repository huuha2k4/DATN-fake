package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_message_reactions", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(GroupMessageReaction.GroupMessageReactionId.class)
public class GroupMessageReaction {

    @Id
    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "reaction", nullable = false, length = 20)
    private String reaction;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupMessageReactionId implements Serializable {
        private UUID messageId;
        private UUID userId;
    }
}

