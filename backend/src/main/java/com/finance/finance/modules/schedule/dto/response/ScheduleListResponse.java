package com.finance.finance.modules.schedule.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO cho danh sách schedule (list endpoint)
 * Chứa thông tin tóm tắt, không chi tiết như ScheduleResponse
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleListResponse {

    private Long id;

    @JsonProperty("schedule_type")
    private String scheduleType;

    private String name;

    @JsonProperty("recurrence_text")
    private String recurrenceText;

    @JsonProperty("next_occurrence")
    private LocalDate nextOccurrence;

    @JsonProperty("recurrence_rule")
    private String recurrenceRule;

    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("end_date")
    private LocalDate endDate;

    private String status;

    // Transaction summary (chỉ có khi schedule_type = TRANSACTION)
    @JsonProperty("transaction_template")
    private TransactionSummary transactionTemplate;

    // Statistics
    @JsonProperty("total_executed")
    private Integer totalExecuted;

    @JsonProperty("last_executed")
    private LocalDate lastExecuted;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    // ==================== Nested Classes ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TransactionSummary {
        @JsonProperty("type")
        private String type;

        private String amount;

        @JsonProperty("category")
        private String category;

        @JsonProperty("account")
        private String account;
    }
}
