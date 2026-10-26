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
import java.util.UUID;

/**
 * Response DTO cho chi tiết schedule với lịch sử occurrences
 * Dùng cho GET /schedules/{id} endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleDetailResponse {

    private Long id;

    @JsonProperty("schedule_type")
    private String scheduleType;

    private String name;

    @JsonProperty("recurrence_rule")
    private String recurrenceRule;

    @JsonProperty("recurrence_text")
    private String recurrenceText;

    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("end_date")
    private LocalDate endDate;

    @JsonProperty("next_occurrence")
    private LocalDate nextOccurrence;

    private String status;

    // Transaction template (chỉ có khi schedule_type = TRANSACTION)
    @JsonProperty("transaction_template")
    private TransactionTemplateDetail transactionTemplate;

    // Reminder settings (chỉ có khi schedule_type = REMINDER)
    @JsonProperty("reminder_message")
    private String reminderMessage;

    @JsonProperty("auto_execute")
    private Boolean autoExecute;

    @JsonProperty("notification_enabled")
    private Boolean notificationEnabled;

    @JsonProperty("notification_time_before_minutes")
    private Integer notificationTimeBeforeMinutes;

    @JsonProperty("notification_channels")
    private List<String> notificationChannels;

    // Statistics
    private Statistics statistics;

    // Recent occurrences
    @JsonProperty("recent_occurrences")
    private List<OccurrenceHistoryItem> recentOccurrences;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    // ==================== Nested Classes ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TransactionTemplateDetail {
        @JsonProperty("transaction_type")
        private String transactionType;

        @JsonProperty("account_id")
        private UUID accountId;

        @JsonProperty("account_name")
        private String accountName;

        @JsonProperty("to_account_id")
        private UUID toAccountId;

        @JsonProperty("to_account_name")
        private String toAccountName;

        private String amount;

        @JsonProperty("currency_code")
        private String currencyCode;

        @JsonProperty("category_id")
        private UUID categoryId;

        @JsonProperty("category_name")
        private String categoryName;

        @JsonProperty("merchant_id")
        private UUID merchantId;

        @JsonProperty("merchant_name")
        private String merchantName;

        private String description;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Statistics {
        @JsonProperty("total_occurrences")
        private Integer totalOccurrences;

        private Integer executed;
        private Integer skipped;
        private Integer pending;

        @JsonProperty("total_amount")
        private String totalAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class OccurrenceHistoryItem {
        private Long id;

        @JsonProperty("scheduled_date")
        private LocalDate scheduledDate;

        private String status;

        @JsonProperty("transaction_id")
        private java.util.UUID transactionId;

        @JsonProperty("executed_at")
        private LocalDateTime executedAt;

        @JsonProperty("skip_reason")
        private String skipReason;

        @JsonProperty("skipped_at")
        private LocalDateTime skippedAt;

        @JsonProperty("failure_reason")
        private String failureReason;

        @JsonProperty("failed_at")
        private LocalDateTime failedAt;
    }
}
