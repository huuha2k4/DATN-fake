package com.finance.finance.modules.budget.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.AlertLevel;
import com.finance.finance.common.enums.BudgetPeriodType;
import com.finance.finance.common.enums.BudgetStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BudgetResponse {
    
    private UUID id;
    private String name;
    private BudgetPeriodType periodType;
    private LocalDate startDate;
    private LocalDate endDate;
    
    private BigDecimal totalAmount;
    private BigDecimal spentAmount;
    private BigDecimal remaining;
    private Double percentageUsed;
    
    private String currencyCode;
    private BudgetStatus status;
    private AlertLevel alertLevel;
    
    private Boolean rolloverEnabled;
    private Integer alertThresholdPercentage;
    
    // Period info
    private Integer daysTotal;
    private Integer daysElapsed;
    private Integer daysRemaining;
    private BigDecimal dailyBudgetRemaining;
    private BigDecimal projectedSpending;
    
    // Items
    private List<BudgetItemResponse> items;
    private Integer itemsCount;
    private Integer categoriesExceeded;
    
    // Top expenses (optional)
    private List<TopExpense> topExpenses;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer version;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BudgetItemResponse {
        private UUID id;
        private String name;
        private CategoryInfo category;
        private BigDecimal amount;
        private BigDecimal spentAmount;
        private BigDecimal remaining;
        private Double percentageUsed;
        private AlertLevel alertLevel;
        private Integer alertThresholdPercentage;
        private BigDecimal dailyAverage;
        private BigDecimal projectedTotal;
        private Boolean onTrack;
        private Integer transactionCount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInfo {
        private UUID id;
        private String name;
        private String icon;
        private String color;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopExpense {
        private UUID transactionId;
        private BigDecimal amount;
        private String description;
        private String category;
        private LocalDate date;
    }
}
