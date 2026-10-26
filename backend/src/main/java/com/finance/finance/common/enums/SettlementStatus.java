package com.finance.finance.common.enums;

/**
 * Trạng thái của giao dịch thanh toán công nợ
 */
public enum SettlementStatus {
    /**
     * Đang chờ xác nhận
     */
    PENDING,

    /**
     * Đã xác nhận
     */
    CONFIRMED,

    /**
     * Đã từ chối
     */
    REJECTED
}
