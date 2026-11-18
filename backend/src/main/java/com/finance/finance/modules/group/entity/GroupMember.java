package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.MemberRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_members", schema = "core")
@IdClass(GroupMemberId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember {
    @Id
    @Column(name = "group_id")
    private UUID groupId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    @Column(name = "contribution_ratio", precision = 5, scale = 2)
    private BigDecimal contributionRatio;

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Column(name = "notification_enabled", nullable = false)
    @Builder.Default
    private Boolean notificationEnabled = true;

    /**
     * Thành viên này có được xem chi tiêu gia đình không?
     * Bố mẹ quyết định khi thêm con vào nhóm
     */
    @Column(name = "can_view_family_expenses", nullable = false)
    @Builder.Default
    private Boolean canViewFamilyExpenses = true;

    /**
     * Thành viên này có phải là "con" không?
     * Đánh dấu để áp dụng các chính sách quản lý trẻ em
     */
    @Column(name = "is_child_profile", nullable = false)
    @Builder.Default
    private Boolean isChildProfile = false;

    /**
     * ID của ChildWallet được gắn với thành viên này (nếu có)
     * Dùng cho trường hợp con tự tạo tài khoản rồi gia nhập gia đình
     */
    @Column(name = "linked_child_wallet_id")
    private UUID linkedChildWalletId;
}
