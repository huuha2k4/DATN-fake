package com.finance.finance.modules.budget.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.AlertLevel;
import com.finance.finance.common.enums.BudgetStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BudgetStatusResponse {
    
    private UUID budgetId;
    private BudgetStatus status;
    private AlertLevel alertLevel;
    
    private BigDecimal totalAmount;
    private BigDecimal spentAmount;
    private BigDecimal remaining;
    private Double percentageUsed;
    
    private Integer daysRemaining;
    private BigDecimal dailyBudgetRemaining;
    private BigDecimal projectedSpending;
    private BigDecimal projectedOverspend;
    
    private List<CategoryAtRisk> categoriesAtRisk;
    private List<String> recommendations;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryAtRisk {
        private UUID categoryId;
        private String categoryName;
        private Double percentageUsed;
        private AlertLevel alertLevel;
    }
}
