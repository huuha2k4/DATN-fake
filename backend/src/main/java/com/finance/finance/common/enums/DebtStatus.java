package com.finance.finance.common.enums;

/**
 * Trạng thái khoản nợ
 */
public enum DebtStatus {
    /**
     * Đang hoạt động, chưa trả hết
     */
    ACTIVE,
    
    /**
     * Đã trả hết
     */
    PAID_OFF,
    
    /**
     * Quá hạn
     */
    OVERDUE,
    
    /**
     * Đã hủy/xóa
     */
    CANCELLED
}
