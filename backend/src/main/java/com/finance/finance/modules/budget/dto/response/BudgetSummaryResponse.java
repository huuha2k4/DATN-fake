package com.finance.finance.modules.budget.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.BudgetStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BudgetSummaryResponse {
    
    private CurrentPeriod currentPeriod;
    private List<ByCategory> byCategory;
    private Performance performance;
    private Trends trends;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentPeriod {
        private String name;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal totalBudgeted;
        private BigDecimal totalSpent;
        private BigDecimal totalRemaining;
        private Double percentageUsed;
        private BudgetStatus status;
        private Integer daysRemaining;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByCategory {
        private String category;
        private BigDecimal budgeted;
        private BigDecimal spent;
        private Double percentage;
        private BudgetStatus status;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Performance {
        private Integer monthsOnTrack;
        private Integer monthsExceeded;
        private Double successRate;
        private Double averageUtilization;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Trends {
        private TrendComparison vsLastMonth;
        private TrendComparison vsAvg3Months;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendComparison {
        private Double spendingChange;
        private String direction; // UP, DOWN, STABLE
    }
}
