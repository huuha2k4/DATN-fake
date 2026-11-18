package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.DataSharingLevel;
import com.finance.finance.common.enums.SharingRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Yêu cầu chia sẻ dữ liệu chi tiêu giữa con và bố mẹ
 * Dùng cho trường hợp con tự tạo tài khoản độc lập rồi gia nhập gia đình
 */
@Entity
@Table(name = "child_data_sharing_requests", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildDataSharingRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /**
     * ID của ChildWallet được yêu cầu chia sẻ dữ liệu
     */
    @Column(name = "child_wallet_id", nullable = false)
    private UUID childWalletId;

    /**
     * ID của con (người sở hữu dữ liệu)
     */
    @Column(name = "child_user_id", nullable = false)
    private UUID childUserId;

    /**
     * ID của bố mẹ yêu cầu xem dữ liệu
     */
    @Column(name = "requested_by_user_id", nullable = false)
    private UUID requestedByUserId;

    /**
     * ID của nhóm gia đình
     */
    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    /**
     * Mức độ chia sẻ được yêu cầu
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "requested_level", nullable = false, length = 20)
    private DataSharingLevel requestedLevel;

    /**
     * Trạng thái yêu cầu
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SharingRequestStatus status = SharingRequestStatus.PENDING;

    /**
     * Lý do yêu cầu (từ bố mẹ)
     */
    @Column(columnDefinition = "text")
    private String requestReason;

    /**
     * Lý do từ chối (từ con)
     */
    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    /**
     * Thời điểm yêu cầu
     */
    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    /**
     * Thời điểm con phản hồi (approve/reject)
     */
    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    /**
     * Thời điểm hết hạn đồng ý (nếu approved)
     * Thường là 3 tháng sau khi approve
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * Thời điểm con thu hồi quyền truy cập
     */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Ghi chú nội bộ
     */
    @Column(columnDefinition = "text")
    private String notes;
}
