package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_message_reads", schema = "core")
@IdClass(GroupMessageReadId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMessageRead {
    @Id
    @Column(name = "message_id")
    private UUID messageId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "read_at", nullable = false)
    @Builder.Default
    private LocalDateTime readAt = LocalDateTime.now();
}
