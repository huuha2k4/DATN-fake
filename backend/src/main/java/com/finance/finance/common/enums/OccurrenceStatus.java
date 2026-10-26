package com.finance.finance.common.enums;

/**
 * Trạng thái của một lần xuất hiện trong lịch định kỳ
 */
public enum OccurrenceStatus {
    /**
     * Đang chờ thực hiện
     */
    PENDING,
    
    /**
     * Đã thực hiện
     */
    EXECUTED,
    
    /**
     * Đã bỏ qua
     */
    SKIPPED,
    
    /**
     * Thất bại (lỗi khi thực hiện)
     */
    FAILED
}
