-- =====================================================
-- V47: Create User Notification Settings Table
-- =====================================================
-- Description: Create user_notification_settings table
--              to persist user-specific notification preferences
-- Author: System
-- Date: 2026-11-09
-- =====================================================

CREATE TABLE IF NOT EXISTS core.user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,

    -- 1. Nhóm nhắc nợ & Lịch tài chính
    reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    debt_due_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_due_reminder BOOLEAN NOT NULL DEFAULT TRUE,
    remind_advance_days INT NOT NULL DEFAULT 1,

    -- 2. Nhóm ngân sách & Chi tiêu
    budget_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    budget_threshold_80 BOOLEAN NOT NULL DEFAULT TRUE,
    budget_threshold_100 BOOLEAN NOT NULL DEFAULT TRUE,
    balance_forecast_alert BOOLEAN NOT NULL DEFAULT TRUE,

    -- 3. Nhóm giao dịch & Quỹ nhóm
    transaction_success_notify BOOLEAN NOT NULL DEFAULT TRUE,
    group_expense_notify BOOLEAN NOT NULL DEFAULT TRUE,

    -- 4. Nhóm báo cáo định kỳ
    weekly_report_notify BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_report_notify BOOLEAN NOT NULL DEFAULT TRUE,

    -- 5. Cài đặt âm thanh & Rung
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    vibrate_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_notification_settings_user FOREIGN KEY (user_id)
        REFERENCES core.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON core.user_notification_settings(user_id);

