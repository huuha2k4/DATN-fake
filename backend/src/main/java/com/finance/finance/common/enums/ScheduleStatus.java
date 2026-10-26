package com.finance.finance.common.enums;

/**
 * Trạng thái của lịch định kỳ
 */
public enum ScheduleStatus {
    /**
     * Đang hoạt động
     */
    ACTIVE,
    
    /**
     * Tạm dừng
     */
    PAUSED,
    
    /**
     * Đã hoàn thành (khi đến end_date)
     */
    COMPLETED,
    
    /**
     * Đã hủy bỏ
     */
    CANCELLED
}
