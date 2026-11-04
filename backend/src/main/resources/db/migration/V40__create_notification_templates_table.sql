-- =====================================================
-- V40: Create auto notification templates table
-- =====================================================

CREATE TABLE IF NOT EXISTS core.notification_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) UNIQUE NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body_template   TEXT        NOT NULL,
    trigger_event   VARCHAR(100) NOT NULL, -- WELCOME_ONBOARDING, MONTHLY_BUDGET_REMINDER, WEEKLY_SPENDING_REPORT, INVOICE_OCR_SUCCESS, VIP_EXPIRE_REMINDER
    schedule_cron   VARCHAR(50),           -- Ví dụ: '0 8 1 * *' (ngày 1 hàng tháng)
    target_audience VARCHAR(50)  NOT NULL DEFAULT 'ALL',
    priority        VARCHAR(50)  NOT NULL DEFAULT 'NORMAL',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    total_dispatched BIGINT      NOT NULL DEFAULT 0,
    last_dispatched_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed các thông báo tự động mẫu chuẩn nghiệp vụ Finora
INSERT INTO core.notification_templates (code, title, body_template, trigger_event, schedule_cron, target_audience, priority, is_active, total_dispatched)
VALUES 
('AUTO_WELCOME', 'Chào mừng bạn đến với Finora! 🌿', 'Chào mừng {user_name} gia nhập Finora. Khám phá ngay các tính năng lập ngân sách và trợ lý tài chính thông minh nhé!', 'WELCOME_ONBOARDING', NULL, 'ALL', 'HIGH', TRUE, 12),
('AUTO_MONTHLY_BUDGET', 'Đầu tháng mới: Đặt hạn mức chi tiêu 🎯', 'Chào {user_name}, tháng mới đã bắt đầu! Hãy thiết lập ngân sách tháng để kiểm soát chi tiêu hợp lý.', 'MONTHLY_BUDGET_REMINDER', '0 8 1 * *', 'ALL', 'NORMAL', TRUE, 45),
('AUTO_WEEKLY_REPORT', 'Báo cáo tài chính tuần qua của bạn 📊', 'Finora đã tổng hợp xong báo cáo biến động số dư và chi tiêu trong tuần của bạn. Nhấn để xem ngay!', 'WEEKLY_SPENDING_REPORT', '0 20 * * 0', 'ALL', 'NORMAL', TRUE, 38),
('AUTO_VIP_EXPIRY', 'Gói cước VIP sắp hết hạn ⚠️', 'Gói {subscription_tier} của bạn sẽ hết hạn trong 3 ngày tới. Gia hạn ngay để không bị gián đoạn tính năng không giới hạn OCR và FinAI.', 'VIP_EXPIRE_REMINDER', '0 9 * * *', 'PREMIUM_ONLY', 'HIGH', TRUE, 6)
ON CONFLICT (code) DO NOTHING;

