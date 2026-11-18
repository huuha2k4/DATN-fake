package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Response DTO cho tổng quan chi tiêu của con (SUMMARY_DAILY level)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildTransactionSummaryResponse {
    
    private LocalDate startDate;
    private LocalDate endDate;
    
    private BigDecimal totalSpent;
    private Integer transactionCount;
    private BigDecimal avgPerDay;
    
    /**
     * Tổng chi tiêu theo ngày
     */
    private List<DailySummary> dailyBreakdown;
    
    /**
     * Tổng chi tiêu theo danh mục
     */
    private List<CategorySummary> categoryBreakdown;
    
    private String message;  // "Con chưa cho phép xem chi tiết..."
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailySummary {
        private LocalDate date;
        private BigDecimal total;
        private Integer count;
        private List<CategoryAmount> categories;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryAmount {
        private String categoryName;
        private BigDecimal amount;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategorySummary {
        private String categoryName;
        private BigDecimal amount;
        private Integer count;
        private BigDecimal percentage;
    }
}
