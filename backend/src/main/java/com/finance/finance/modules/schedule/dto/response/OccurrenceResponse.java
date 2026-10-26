package com.finance.finance.modules.schedule.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO cho occurrence operations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OccurrenceResponse {

    @JsonProperty("occurrence_id")
    private Long occurrenceId;

    @JsonProperty("scheduled_date")
    private LocalDate scheduledDate;

    private String status;

    @JsonProperty("transaction_id")
    private java.util.UUID transactionId;

    @JsonProperty("executed_at")
    private LocalDateTime executedAt;

    @JsonProperty("next_occurrence")
    private LocalDate nextOccurrence;

    // ==================== For Skip Response ====================

    @JsonProperty("skip_reason")
    private String skipReason;

    @JsonProperty("skipped_at")
    private LocalDateTime skippedAt;

    // ==================== For Upcoming Occurrences ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpcomingOccurrencesResponse {
        private ScheduleInfo schedule;
        private List<UpcomingOccurrence> occurrences;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScheduleInfo {
        private Long id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class UpcomingOccurrence {
        private Long id;

        @JsonProperty("scheduled_date")
        private LocalDate scheduledDate;

        private String status;

        @JsonProperty("days_until")
        private Integer daysUntil;
    }
}
