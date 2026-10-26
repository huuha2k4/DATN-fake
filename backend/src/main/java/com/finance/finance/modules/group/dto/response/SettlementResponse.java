package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementResponse {
    private UUID id;
    private UUID groupId;
    private UUID fromUserId;
    private UUID toUserId;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private LocalDate settlementDate;
    private String notes;
    private String proofKey;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private UserSummary fromUser;
    private UserSummary toUser;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private String fullName;
        private String avatarKey;
    }
}
