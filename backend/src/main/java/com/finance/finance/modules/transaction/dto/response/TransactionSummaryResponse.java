package com.finance.finance.modules.transaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionSummaryResponse {
    
    private PeriodDto period;
    private SummaryDto summary;
    private List<PeriodItemDto> byPeriod;
    private List<CategoryItemDto> byCategory;
    private String currencyCode;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodDto {
        private LocalDate from;
        private LocalDate to;
        private String groupBy;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDto {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal netCashFlow;
        private BigDecimal averageDailyExpense;
        private Integer transactionCount;
        private LargestExpenseDto largestExpense;
        private MostFrequentCategoryDto mostFrequentCategory;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LargestExpenseDto {
        private BigDecimal amount;
        private String description;
        private LocalDate date;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MostFrequentCategoryDto {
        private UUID id;
        private String name;
        private Integer count;
        private BigDecimal totalAmount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodItemDto {
        private String date;
        private BigDecimal income;
        private BigDecimal expense;
        private BigDecimal net;
        private Integer transactionCount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryItemDto {
        private UUID categoryId;
        private String categoryName;
        private BigDecimal totalAmount;
        private BigDecimal percentage;
        private Integer transactionCount;
        private BigDecimal averageAmount;
    }
}
