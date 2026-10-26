package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChoreResponse {
    private UUID id;
    private UUID walletId;
    private String title;
    private String description;
    private BigDecimal rewardAmount;
    private String currency;
    private String frequency;
    private LocalDate dueDate;
    private String difficulty;
    private Integer estimatedMinutes;
    private String icon;
    private String status;
    private String proofImageKey;
    private String completionNotes;
    private LocalDateTime completedAt;
    private UUID approvedByUserId;
    private LocalDateTime approvedAt;
    private String feedback;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private Boolean canRetry;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
