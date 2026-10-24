package com.finance.finance.common.enums;

public enum UserStatus {
    PENDING,    // Chưa xác thực email
    ACTIVE,     // Đang hoạt động
    INACTIVE,   // Không hoạt động
    LOCKED,     // Bị khóa tạm thời
    DISABLED,   // Bị vô hiệu hóa
    DELETED     // Đã xóa (soft delete)
}
