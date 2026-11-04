-- =====================================================
-- V42: Add daily 20:00 spending check notification template
-- =====================================================

INSERT INTO core.notification_templates (code, title, body_template, trigger_event, schedule_cron, target_audience, priority, is_active, total_dispatched)
VALUES 
('AUTO_DAILY_20PM_NO_TX', 'Hôm nay bạn chưa ghi nhận chi tiêu nào? 📝', 'Chào {user_name}, đã 20:00 rồi! Hôm nay bạn có khoản chi tiêu hay hóa đơn nào chưa kịp ghi chép không? Hãy dành 1 phút để ghi nhận nhé.', 'DAILY_NO_EXPENSE_CHECK', '0 20 * * *', 'ALL', 'NORMAL', TRUE, 0),
('AUTO_OCR_LIMIT_WARNING', 'Cảnh báo hạn mức quét hóa đơn OCR 🧾', 'Chào {user_name}, bạn đã sử dụng gần hết lượt quét hóa đơn OCR miễn phí trong tháng. Nâng cấp VIP để không giới hạn lượt quét nhé!', 'OCR_LIMIT_WARNING', NULL, 'FREE_ONLY', 'NORMAL', TRUE, 0)
ON CONFLICT (code) DO NOTHING;

