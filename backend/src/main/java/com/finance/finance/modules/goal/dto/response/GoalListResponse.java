package com.finance.finance.modules.goal.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.GoalStatus;
import com.finance.finance.common.enums.GoalType;
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
public class GoalListResponse {
    
    private List<GoalSummaryItem> goals;
    private Summary summary;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalSummaryItem {
        private UUID id;
        private String name;
        private GoalType goalType;
        private BigDecimal targetAmount;
        private BigDecimal currentAmount;
        private Double percentageComplete;
        private GoalStatus status;
        private LocalDate targetDate;
        private Integer daysRemaining;
        private String icon;
        private String color;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Integer totalGoals;
        private Integer inProgress;
        private Integer completed;
        private BigDecimal totalTarget;
        private BigDecimal totalSaved;
    }
}
