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
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BudgetListResponse {
    
    private List<BudgetSummaryItem> budgets;
    private Summary summary;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BudgetSummaryItem {
        private UUID id;
        private String name;
        private BudgetPeriodType periodType;
        private LocalDate startDate;
        private LocalDate endDate;
        
        private BigDecimal totalAmount;
        private BigDecimal spentAmount;
        private BigDecimal remaining;
        private Double percentageUsed;
        
        private BudgetStatus status;
        private AlertLevel alertLevel;
        
        private Integer daysRemaining;
        private Integer itemsCount;
        private Integer categoriesExceeded;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Integer totalBudgets;
        private Integer activeBudgets;
        private Integer onTrack;
        private Integer warning;
        private Integer exceeded;
    }
}
