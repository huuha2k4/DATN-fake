package com.finance.finance.modules.notification.dto.response;

import com.finance.finance.modules.notification.entity.UserNotificationSetting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsResponse {

    private Boolean remindersEnabled;
    private Boolean debtDueReminder;
    private Boolean scheduleDueReminder;
    private Integer remindAdvanceDays;

    private Boolean budgetAlertEnabled;
    private Boolean budgetThreshold80;
    private Boolean budgetThreshold100;
    private Boolean balanceForecastAlert;

    private Boolean transactionSuccessNotify;
    private Boolean groupExpenseNotify;

    private Boolean weeklyReportNotify;
    private Boolean monthlyReportNotify;

    private Boolean soundEnabled;
    private Boolean vibrateEnabled;

    private LocalDateTime updatedAt;

    public static NotificationSettingsResponse fromEntity(UserNotificationSetting setting) {
        return NotificationSettingsResponse.builder()
                .remindersEnabled(setting.getRemindersEnabled())
                .debtDueReminder(setting.getDebtDueReminder())
                .scheduleDueReminder(setting.getScheduleDueReminder())
                .remindAdvanceDays(setting.getRemindAdvanceDays())
                .budgetAlertEnabled(setting.getBudgetAlertEnabled())
                .budgetThreshold80(setting.getBudgetThreshold80())
                .budgetThreshold100(setting.getBudgetThreshold100())
                .balanceForecastAlert(setting.getBalanceForecastAlert())
                .transactionSuccessNotify(setting.getTransactionSuccessNotify())
                .groupExpenseNotify(setting.getGroupExpenseNotify())
                .weeklyReportNotify(setting.getWeeklyReportNotify())
                .monthlyReportNotify(setting.getMonthlyReportNotify())
                .soundEnabled(setting.getSoundEnabled())
                .vibrateEnabled(setting.getVibrateEnabled())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }

    public static NotificationSettingsResponse defaultSettings() {
        return NotificationSettingsResponse.builder()
                .remindersEnabled(true)
                .debtDueReminder(true)
                .scheduleDueReminder(true)
                .remindAdvanceDays(1)
                .budgetAlertEnabled(true)
                .budgetThreshold80(true)
                .budgetThreshold100(true)
                .balanceForecastAlert(true)
                .transactionSuccessNotify(true)
                .groupExpenseNotify(true)
                .weeklyReportNotify(true)
                .monthlyReportNotify(true)
                .soundEnabled(true)
                .vibrateEnabled(true)
                .build();
    }
}

