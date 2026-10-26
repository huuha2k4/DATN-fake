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
 * Request DTO để cập nhật lịch định kỳ
 * Tất cả fields đều optional - chỉ cập nhật những field được gửi lên
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateScheduleRequest {

    @JsonProperty("schedule_type")
    private String scheduleType;

    @Size(min = 1, max = 255, message = "Name must be between 1 and 255 characters")
    private String name;

    @Size(max = 500, message = "Recurrence rule must not exceed 500 characters")
    @JsonProperty("recurrence_rule")
    private String recurrenceRule;

    @JsonProperty("end_date")
    private LocalDate endDate;

    @Valid
    @JsonProperty("transaction_template")
    private TransactionTemplate transactionTemplate;

    @JsonProperty("reminder_message")
    @Size(max = 1000, message = "Reminder message must not exceed 1000 characters")
    private String reminderMessage;

    @JsonProperty("auto_execute")
    private Boolean autoExecute;

    @JsonProperty("notification_enabled")
    private Boolean notificationEnabled;

    @JsonProperty("notification_time_before_minutes")
    @Min(value = 0, message = "Notification time before must be positive")
    @Max(value = 10080, message = "Notification time before must not exceed 1 week (10080 minutes)")
    private Integer notificationTimeBeforeMinutes;

    @JsonProperty("notification_channels")
    private List<NotificationChannel> notificationChannels;

    /**
     * Kiểm tra xem request có data để update không
     */
    public boolean hasUpdates() {
        return scheduleType != null || name != null || recurrenceRule != null || endDate != null
                || transactionTemplate != null || reminderMessage != null
                || autoExecute != null || notificationEnabled != null
                || notificationTimeBeforeMinutes != null || notificationChannels != null;
    }
}
