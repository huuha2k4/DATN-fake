package com.finance.finance.modules.goal.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.*;
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
public class GoalResponse {
    
    private UUID id;
    private String name;
    private GoalType goalType;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private BigDecimal remaining;
    private Double percentageComplete;
    private String currencyCode;
    private GoalStatus status;
    private GoalPriority priority;
    private String icon;
    private String color;
    private String description;
    private LocalDate targetDate;
    private Integer daysTotal;
    private Integer daysElapsed;
    private Integer daysRemaining;
    private BigDecimal suggestedMonthlySaving;
    
    private AutoSaveSettings autoSave;
    private ProgressInfo progress;
    private List<ContributionInfo> contributions;
    private List<MilestoneInfo> milestones;
    
    private LocalDateTime completedAt;
    private String completedNote;
    private BigDecimal actualAmountUsed;
    private BigDecimal leftover;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer version;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AutoSaveSettings {
        private Boolean enabled;
        private BigDecimal amount;
        private AutoSaveFrequency frequency;
        private LocalDate nextContributionDate;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgressInfo {
        private Boolean onTrack;
        private BigDecimal expectedAmountByNow;
        private BigDecimal aheadBehind;
        private LocalDate completionForecastDate;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContributionInfo {
        private UUID id;
        private BigDecimal amount;
        private String note;
        private LocalDateTime contributedAt;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneInfo {
        private UUID id;
        private String name;
        private Integer percentage;
        private BigDecimal targetAmount;
        private Boolean achieved;
        private LocalDateTime achievedAt;
        private String reward;
    }
}
