package com.finance.finance.common.enums;

/**
 * Trạng thái yêu cầu chia sẻ dữ liệu
 */
public enum SharingRequestStatus {
    /**
     * Đang chờ con phê duyệt
     */
    PENDING,
    
    /**
     * Con đã đồng ý chia sẻ
     */
    APPROVED,
    
    /**
     * Con từ chối chia sẻ
     */
    REJECTED,
    
    /**
     * Đã hết hạn (consent expired)
     */
    EXPIRED,
    
    /**
     * Con thu hồi quyền truy cập
     */
    REVOKED
}
