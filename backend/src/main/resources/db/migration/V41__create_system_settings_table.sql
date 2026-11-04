-- =====================================================
-- V41: Create system settings table
-- =====================================================

CREATE TABLE IF NOT EXISTS core.system_settings (
    setting_key     VARCHAR(100) PRIMARY KEY,
    setting_value   TEXT         NOT NULL,
    setting_group   VARCHAR(50)  NOT NULL DEFAULT 'GENERAL',
    description     VARCHAR(500),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed các cấu hình hệ thống Finora
INSERT INTO core.system_settings (setting_key, setting_value, setting_group, description)
VALUES 
('MAINTENANCE_MODE', 'false', 'SYSTEM', 'Chế độ bảo trì hệ thống toàn cục'),
('ALLOW_REGISTRATION', 'true', 'AUTH', 'Cho phép người dùng mới đăng ký tài khoản'),
('FREE_TIER_MAX_WALLETS', '3', 'SUBSCRIPTION', 'Số lượng ví tối đa cho gói Miễn phí (Free)'),
('FREE_TIER_OCR_LIMIT', '10', 'SUBSCRIPTION', 'Hạn mức quét hóa đơn OCR hàng tháng cho gói Free'),
('PREMIUM_TIER_PRICE_MONTHLY', '49000', 'PRICING', 'Giá gói Hội viên Cá nhân (Premium) theo tháng (VNĐ)'),
('ENTERPRISE_TIER_PRICE_MONTHLY', '199000', 'PRICING', 'Giá gói Hội viên Doanh nghiệp (Enterprise) theo tháng (VNĐ)'),
('AI_RESPONSE_TEMPERATURE', '0.7', 'AI', 'Độ sáng tạo phản hồi của FinAI Assistant (0.0 - 1.0)'),
('SESSION_TIMEOUT_HOURS', '24', 'SECURITY', 'Thời gian hết hạn phiên đăng nhập JWT (giờ)')
ON CONFLICT (setting_key) DO NOTHING;

