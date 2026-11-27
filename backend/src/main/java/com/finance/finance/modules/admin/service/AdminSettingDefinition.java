package com.finance.finance.modules.admin.service;

import java.util.Locale;

public enum AdminSettingDefinition {
    MAINTENANCE_MODE("BOOLEAN", null, null, true, "Chặn truy cập ứng dụng và cấp phiên cho tài khoản thường"),
    ALLOW_REGISTRATION("BOOLEAN", null, null, true, "Đăng ký bằng email hoặc Google"),
    FREE_TIER_MAX_WALLETS("INTEGER", 0, 1000, true, "Giới hạn khi tạo ví mới"),
    FREE_TIER_OCR_LIMIT("INTEGER", 0, 10000, false, "Chỉ xuất hiện trong API giá gói. Chưa dùng để giới hạn OCR"),
    PREMIUM_TIER_PRICE_MONTHLY("INTEGER", 0, 100_000_000, true, "Giá hiển thị trên trang gói cước (VND/tháng)"),
    ENTERPRISE_TIER_PRICE_MONTHLY("INTEGER", 0, 100_000_000, true, "Giá hiển thị trên trang gói cước (VND/tháng)"),
    AI_RESPONSE_TEMPERATURE("DECIMAL", null, null, false, "Giá trị cũ. FinAI sử dụng cấu hình dịch vụ riêng"),
    SESSION_TIMEOUT_HOURS("DURATION", null, null, false, "Giá trị cũ. JWT sử dụng cấu hình triển khai khi khởi động");

    public final String type;
    public final Integer min;
    public final Integer max;
    public final boolean editable;
    public final String effect;

    AdminSettingDefinition(String type, Integer min, Integer max, boolean editable, String effect) {
        this.type = type;
        this.min = min;
        this.max = max;
        this.editable = editable;
        this.effect = effect;
    }

    public static AdminSettingDefinition lookup(String key) {
        try {
            return valueOf(key);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public String normalize(String value) {
        if (!editable || value == null) throw new IllegalArgumentException("Cấu hình này chỉ đọc hoặc thiếu giá trị");
        String text = value.trim().toLowerCase(Locale.ROOT);
        if (type.equals("BOOLEAN")) {
            if ("true".equals(text) || "false".equals(text)) return text;
        } else if (text.matches("[0-9]{1,9}")) {
            int parsed = Integer.parseInt(text);
            if (parsed >= min && parsed <= max) return String.valueOf(parsed);
        }
        throw new IllegalArgumentException("Giá trị cấu hình không hợp lệ");
    }
}
