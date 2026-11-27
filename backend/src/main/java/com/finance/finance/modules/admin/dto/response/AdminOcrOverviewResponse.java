package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
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
    private Double averageConfidence;
    private long linkedTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminOcrItemResponse {
        private UUID id;
        private BigDecimal confidence;
        private Boolean needsReview;
        private Instant createdAt;
    }
}

