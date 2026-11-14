package com.finance.finance.modules.notification.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNotificationSettingsRequest {

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
}

