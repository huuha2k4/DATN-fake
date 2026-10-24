package com.finance.finance.modules.goal.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
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
public class GoalProgressResponse {
    
    private GoalInfo goal;
    private CurrentStatus currentStatus;
    private Forecast forecast;
    private List<HistoryPoint> history;
    private List<ChartDataPoint> chartData;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalInfo {
        private UUID id;
        private String name;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentStatus {
        private Double percentageComplete;
        private Boolean onTrack;
        private Double expectedPercentageByNow;
        private Double behindByPercentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Forecast {
        private LocalDate expectedCompletionDate;
        private Integer behindScheduleDays;
        private BigDecimal needToSaveMonthly;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryPoint {
        private LocalDate date;
        private BigDecimal amount;
        private Double percentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String month;
        private BigDecimal actual;
        private BigDecimal target;
    }
}
