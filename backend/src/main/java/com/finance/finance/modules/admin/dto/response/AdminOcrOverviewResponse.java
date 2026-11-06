package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOcrOverviewResponse {
    private long totalScanned;
    private long scannedToday;
    private long scannedThisMonth;
    private long needReviewCount;
    private double averageConfidence;
    private List<AdminOcrItemResponse> recentReceipts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminOcrItemResponse {
        private UUID id;
        private UUID userId;
        private String userFullName;
        private String userEmail;
        private String merchantName;
        private Long totalAmount;
        private String currency;
        private LocalDate transactionDate;
        private BigDecimal confidence;
        private Boolean needsReview;
        private String aiCategoryName;
        private String kind;
        private Instant createdAt;
    }
}

