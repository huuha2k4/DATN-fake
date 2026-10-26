package com.finance.finance.modules.schedule.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.NotificationChannel;
import com.finance.finance.modules.schedule.dto.TransactionTemplate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO để tạo lịch định kỳ mới
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateScheduleRequest {

    @NotBlank(message = "Schedule type is required")
    @Pattern(regexp = "TRANSACTION|REMINDER", message = "Schedule type must be TRANSACTION or REMINDER")
    @JsonProperty("schedule_type")
    private String scheduleType;

    @NotBlank(message = "Name is required")
    @Size(min = 1, max = 255, message = "Name must be between 1 and 255 characters")
    private String name;

    /**
     * iCalendar recurrence rule
     * Examples:
     * - FREQ=DAILY
     * - FREQ=WEEKLY;BYDAY=MO,WE,FR
     * - FREQ=MONTHLY;BYMONTHDAY=1
     * - FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1
     */
    @NotBlank(message = "Recurrence rule is required")
    @Size(max = 500, message = "Recurrence rule must not exceed 500 characters")
    @JsonProperty("recurrence_rule")
    private String recurrenceRule;

    @NotNull(message = "Start date is required")
    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("end_date")
    private LocalDate endDate;

    // ==================== Transaction Template ====================
    // Required khi schedule_type = TRANSACTION

    @Valid
    @JsonProperty("transaction_template")
    private TransactionTemplate transactionTemplate;

    // ==================== Reminder Settings ====================
    // Required khi schedule_type = REMINDER

    @JsonProperty("reminder_message")
    @Size(max = 1000, message = "Reminder message must not exceed 1000 characters")
    private String reminderMessage;

    // ==================== Execution Settings ====================

    @JsonProperty("auto_execute")
    @Builder.Default
    private Boolean autoExecute = false;

    // ==================== Notification Settings ====================

    @JsonProperty("notification_enabled")
    @Builder.Default
    private Boolean notificationEnabled = true;

    @JsonProperty("notification_time_before_minutes")
    @Min(value = 0, message = "Notification time before must be positive")
    @Max(value = 10080, message = "Notification time before must not exceed 1 week (10080 minutes)")
    private Integer notificationTimeBeforeMinutes;

    @JsonProperty("notification_channels")
    private List<NotificationChannel> notificationChannels;

    // ==================== Validation Methods ====================

    /**
     * Validate end_date phải sau start_date
     */
    @AssertTrue(message = "End date must be after start date")
    private boolean isEndDateValid() {
        if (endDate == null) {
            return true;
        }
        return endDate.isAfter(startDate);
    }

    /**
     * Validate transaction template khi schedule_type = TRANSACTION
     */
    @AssertTrue(message = "Transaction template is required for TRANSACTION schedule type")
    private boolean isTransactionTemplateValid() {
        if (!"TRANSACTION".equals(scheduleType)) {
            return true;
        }
        return transactionTemplate != null && transactionTemplate.isValidTransfer();
    }

    /**
     * Validate reminder message khi schedule_type = REMINDER
     */
    @AssertTrue(message = "Reminder message is required for REMINDER schedule type")
    private boolean isReminderMessageValid() {
        if (!"REMINDER".equals(scheduleType)) {
            return true;
        }
        return reminderMessage != null && !reminderMessage.isBlank();
    }

    public boolean isTransaction() {
        return "TRANSACTION".equals(scheduleType);
    }

    public boolean isReminder() {
        return "REMINDER".equals(scheduleType);
    }
}
