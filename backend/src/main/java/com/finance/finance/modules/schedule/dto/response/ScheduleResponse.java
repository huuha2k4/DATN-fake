package com.finance.finance.modules.schedule.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.modules.schedule.dto.TransactionTemplate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO cho schedule (dùng cho create, update, pause, resume, complete)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleResponse {

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
    private TransactionTemplateInfo transactionTemplate;

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
    @JsonProperty("total_occurrences")
    private Integer totalOccurrences;

    @JsonProperty("executed_count")
    private Integer executedCount;

    @JsonProperty("skipped_count")
    private Integer skippedCount;

    @JsonProperty("failed_count")
    private Integer failedCount;

    @JsonProperty("last_executed_at")
    private LocalDateTime lastExecutedAt;

    // Pause info
    @JsonProperty("paused_at")
    private LocalDateTime pausedAt;

    @JsonProperty("pause_reason")
    private String pauseReason;

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
    public static class TransactionTemplateInfo {
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
}
