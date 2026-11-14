package com.finance.finance.modules.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_notification_settings", schema = "core")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    // 1. Nhóm nhắc nợ & Lịch tài chính
    @Builder.Default
    @Column(name = "reminders_enabled", nullable = false)
    private Boolean remindersEnabled = true;

    @Builder.Default
    @Column(name = "debt_due_reminder", nullable = false)
    private Boolean debtDueReminder = true;

    @Builder.Default
    @Column(name = "schedule_due_reminder", nullable = false)
    private Boolean scheduleDueReminder = true;

    @Builder.Default
    @Column(name = "remind_advance_days", nullable = false)
    private Integer remindAdvanceDays = 1;

    // 2. Nhóm ngân sách & Chi tiêu
    @Builder.Default
    @Column(name = "budget_alert_enabled", nullable = false)
    private Boolean budgetAlertEnabled = true;

    @Builder.Default
    @Column(name = "budget_threshold_80", nullable = false)
    private Boolean budgetThreshold80 = true;

    @Builder.Default
    @Column(name = "budget_threshold_100", nullable = false)
    private Boolean budgetThreshold100 = true;

    @Builder.Default
    @Column(name = "balance_forecast_alert", nullable = false)
    private Boolean balanceForecastAlert = true;

    // 3. Nhóm giao dịch & Quỹ nhóm
    @Builder.Default
    @Column(name = "transaction_success_notify", nullable = false)
    private Boolean transactionSuccessNotify = true;

    @Builder.Default
    @Column(name = "group_expense_notify", nullable = false)
    private Boolean groupExpenseNotify = true;

    // 4. Nhóm báo cáo định kỳ
    @Builder.Default
    @Column(name = "weekly_report_notify", nullable = false)
    private Boolean weeklyReportNotify = true;

    @Builder.Default
    @Column(name = "monthly_report_notify", nullable = false)
    private Boolean monthlyReportNotify = true;

    // 5. Cài đặt âm thanh & Rung
    @Builder.Default
    @Column(name = "sound_enabled", nullable = false)
    private Boolean soundEnabled = true;

    @Builder.Default
    @Column(name = "vibrate_enabled", nullable = false)
    private Boolean vibrateEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

