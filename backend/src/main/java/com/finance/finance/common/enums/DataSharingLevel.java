package com.finance.finance.common.enums;

/**
 * Mức độ chia sẻ dữ liệu chi tiêu giữa con và bố mẹ
 */
public enum DataSharingLevel {
    /**
     * Không chia sẻ gì
     */
    NONE,
    
    /**
     * Chỉ chia sẻ tổng chi tiêu theo ngày và danh mục
     * (không hiển thị chi tiết từng giao dịch)
     */
    SUMMARY_DAILY,
    
    /**
     * Chia sẻ chi tiết từng giao dịch
     * (số tiền, danh mục, ghi chú, hình ảnh)
     */
    DETAILED
}
