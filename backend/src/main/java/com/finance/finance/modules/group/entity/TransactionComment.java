package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.CommentableType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transaction_comments", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionComment {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    @Enumerated(EnumType.STRING)
    @Column(name = "commentable_type", nullable = false, length = 20)
    private CommentableType commentableType;

    @Column(name = "commentable_id", nullable = false)
    private UUID commentableId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "parent_comment_id")
    private UUID parentCommentId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
