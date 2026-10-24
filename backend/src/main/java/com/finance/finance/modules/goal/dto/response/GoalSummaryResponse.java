package com.finance.finance.modules.goal.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.GoalType;
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
public class GoalSummaryResponse {
    
    private Summary summary;
    private List<ByType> byType;
    private List<UpcomingMilestone> upcomingMilestones;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Integer totalGoals;
        private Integer inProgress;
        private Integer completed;
        private Integer onTrack;
        private Integer behindSchedule;
        private BigDecimal totalTargetAmount;
        private BigDecimal totalSaved;
        private Double overallProgress;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByType {
        private GoalType type;
        private Integer count;
        private BigDecimal totalTarget;
        private BigDecimal totalSaved;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingMilestone {
        private String goalName;
        private String milestone;
        private BigDecimal amountNeeded;
        private LocalDate estimatedDate;
    }
}
