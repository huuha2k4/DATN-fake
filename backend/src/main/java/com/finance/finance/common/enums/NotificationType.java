package com.finance.finance.common.enums;

/**
 * Loại thông báo
 */
public enum NotificationType {
    /**
     * Giao dịch mới
     */
    TRANSACTION,
    
    /**
     * Cảnh báo ngân sách
     */
    BUDGET_ALERT,
    
    /**
     * Vượt ngân sách
     */
    BUDGET_EXCEEDED,
    
    /**
     * Đạt milestone mục tiêu
     */
    GOAL_MILESTONE,
    
    /**
     * Hoàn thành mục tiêu
     */
    GOAL_ACHIEVED,
    
    /**
     * Nhắc đóng góp mục tiêu
     */
    GOAL_REMINDER,
    
    /**
     * Nhắc trả nợ
     */
    DEBT_REMINDER,
    
    /**
     * Trễ hạn trả nợ
     */
    DEBT_OVERDUE,
    
    /**
     * Giao dịch định kỳ sắp đến hạn
     */
    RECURRING_DUE,
    
    /**
     * Giao dịch định kỳ thất bại
     */
    RECURRING_FAILED,
    
    /**
     * Phát hiện bất thường
     */
    ANOMALY_DETECTED,
    
    /**
     * Insight mới
     */
    INSIGHT_GENERATED,
    
    /**
     * Tổng kết tuần
     */
    WEEKLY_SUMMARY,
    
    /**
     * Báo cáo tháng
     */
    MONTHLY_REPORT,
    
    /**
     * Lời mời tham gia nhóm
     */
    GROUP_INVITATION,

    /**
     * Giao dịch mới trong nhóm
     */
    GROUP_EXPENSE,

    /**
     * Nộp tiền vào quỹ nhóm
     */
    GROUP_FUND_DEPOSIT,

    /**
     * Bình luận mới trong nhóm
     */
    GROUP_COMMENT,

    /**
     * Con xin cấp tiền
     */
    CHILD_MONEY_REQUEST,

    /**
     * Con hoàn thành nhiệm vụ
     */
    CHILD_CHORE_COMPLETED,

    /**
     * Bé được nạp / cho tiền
     */
    CHILD_MONEY_RECEIVED,

    /**
     * Yêu cầu xin tiền của bé được duyệt hoặc từ chối
     */
    CHILD_REQUEST_RESPONDED,

    /**
     * Bé được giao nhiệm vụ mới
     */
    CHILD_CHORE_ASSIGNED,

    /**
     * Thông báo hệ thống
     */
    SYSTEM
}
