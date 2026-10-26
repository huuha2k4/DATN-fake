package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpendRequestResponse {
    private UUID id;
    private UUID walletId;
    private BigDecimal amount;
    private String currency;
    private UUID categoryId;
    private String description;
    private String notes;
    private String imageKey;
    private String status;
    private UUID respondedByUserId;
    private LocalDateTime respondedAt;
    private String responseNotes;
    private String rejectionReason;
    private UUID transactionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime cancelledAt;
    private ChildSummary child;
    private CategorySummary category;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChildSummary {
        private String name;
        private Integer age;
        private String avatarKey;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategorySummary {
        private UUID id;
        private String name;
        private String icon;
        private String color;
    }
}
