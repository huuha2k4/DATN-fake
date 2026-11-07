package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMonthlyStatisticsResponse {
    private int year;
    private int month;
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal remaining;
    private BigDecimal fundBalance;
    private long transactionCount;
    private Double trendPercentage;
    private List<CategoryStat> categoryStats;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryStat {
        private UUID categoryId;
        private String categoryName;
        private String icon;
        private String color;
        private BigDecimal amount;
        private Double percentage;
        private long count;
    }
}

