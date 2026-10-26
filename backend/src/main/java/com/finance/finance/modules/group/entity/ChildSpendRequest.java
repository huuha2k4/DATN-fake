package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.SpendRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "child_spend_requests", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildSpendRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "image_key")
    private String imageKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SpendRequestStatus status = SpendRequestStatus.PENDING;

    @Column(name = "responded_by_user_id")
    private UUID respondedByUserId;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "response_notes", columnDefinition = "text")
    private String responseNotes;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
}
