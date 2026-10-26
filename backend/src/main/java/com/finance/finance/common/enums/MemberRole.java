package com.finance.finance.common.enums;

/**
 * Vai trò của thành viên trong nhóm
 */
public enum MemberRole {
    /**
     * Chủ nhóm - toàn quyền
     */
    OWNER,

    /**
     * Quản trị viên - có thể quản lý members và expenses
     */
    ADMIN,

    /**
     * Thành viên - có thể tạo expense và thanh toán
     */
    MEMBER
}
