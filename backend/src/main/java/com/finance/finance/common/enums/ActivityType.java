package com.finance.finance.common.enums;

/**
 * Loại hoạt động trong nhóm chi tiêu
 */
public enum ActivityType {
    /**
     * Thêm chi phí mới
     */
    EXPENSE_ADDED,

    /**
     * Cập nhật chi phí
     */
    EXPENSE_UPDATED,

    /**
     * Xóa chi phí
     */
    EXPENSE_DELETED,

    /**
     * Thành viên mới tham gia
     */
    MEMBER_JOINED,

    /**
     * Thành viên rời nhóm
     */
    MEMBER_LEFT,

    /**
     * Thay đổi vai trò thành viên
     */
    MEMBER_ROLE_CHANGED,

    /**
     * Thanh toán được tạo
     */
    PAYMENT_MADE,

    /**
     * Thanh toán được xác nhận
     */
    PAYMENT_CONFIRMED,

    /**
     * Cập nhật thông tin nhóm
     */
    GROUP_UPDATED
}
