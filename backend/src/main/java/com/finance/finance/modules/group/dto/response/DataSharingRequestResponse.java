package com.finance.finance.modules.group.dto.response;

import com.finance.finance.common.enums.DataSharingLevel;
import com.finance.finance.common.enums.SharingRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO cho yêu cầu chia sẻ dữ liệu
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataSharingRequestResponse {
    
    private UUID id;
    private UUID childWalletId;
    private UUID childUserId;
    private UUID requestedByUserId;
    private UUID groupId;
    
    private String requestedByName;  // Tên bố mẹ
    private String childName;        // Tên con
    
    private DataSharingLevel requestedLevel;
    private SharingRequestStatus status;
    
    private String requestReason;
    private String rejectionReason;
    
    private LocalDateTime requestedAt;
    private LocalDateTime respondedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    
    // Helper flags
    private Boolean isExpired;
    private Boolean canRevoke;
}
