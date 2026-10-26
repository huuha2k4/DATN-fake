package com.finance.finance.common.enums;

/**
 * Loại lịch định kỳ
 */
public enum ScheduleType {
    /**
     * Giao dịch định kỳ - tự động tạo transaction
     */
    TRANSACTION,
    
    /**
     * Nhắc nhở - chỉ gửi thông báo không tạo transaction
     */
    REMINDER
}
