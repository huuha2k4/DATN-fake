-- =====================================================
-- V55: Update AUTO_WEEKLY_REPORT template to 08:00 AM Monday
-- =====================================================

UPDATE core.notification_templates
SET 
    title = '📊 Báo cáo tài chính tuần của bạn đã sẵn sàng!',
    body_template = 'Tuần qua bạn đã chi {spending_summary}. Xem ngay báo cáo chi tiết nhé!',
    schedule_cron = '0 0 8 ? * MON',
    updated_at = NOW()
WHERE code = 'AUTO_WEEKLY_REPORT';

