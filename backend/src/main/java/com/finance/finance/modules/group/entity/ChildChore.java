package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.ChoreDifficulty;
import com.finance.finance.common.enums.ChoreFrequency;
import com.finance.finance.common.enums.ChoreStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "child_chores", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildChore {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "reward_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal rewardAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChoreFrequency frequency;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ChoreDifficulty difficulty;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @Column(length = 10)
    private String icon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ChoreStatus status = ChoreStatus.ASSIGNED;

    @Column(name = "proof_image_key")
    private String proofImageKey;

    @Column(name = "completion_notes", columnDefinition = "text")
    private String completionNotes;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "approved_by_user_id")
    private UUID approvedByUserId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(columnDefinition = "text")
    private String feedback;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
