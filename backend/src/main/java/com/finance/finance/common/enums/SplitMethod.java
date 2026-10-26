package com.finance.finance.common.enums;

/**
 * Phương thức phân chia chi phí trong nhóm
 */
public enum SplitMethod {
    /**
     * Chia đều cho tất cả thành viên
     */
    EQUAL,

    /**
     * Chia theo phần trăm
     */
    PERCENTAGE,

    /**
     * Chia theo số tiền cụ thể
     */
    EXACT,

    /**
     * Chia theo shares (tỷ lệ)
     */
    SHARES
}
