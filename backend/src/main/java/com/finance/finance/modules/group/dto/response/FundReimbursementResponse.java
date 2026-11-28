package com.finance.finance.modules.group.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class FundReimbursementResponse {
    private UUID id;
    private UUID groupId;
    private UUID expenseId;
    private UUID beneficiaryUserId;
    private BigDecimal totalAmount;
    private BigDecimal reimbursedAmount;
    private BigDecimal remainingAmount;
    private String status;
    private LocalDateTime createdAt;
    private boolean walletAuthorized;
    private UUID authorizedAccountId;

    public record Payment(UUID id, BigDecimal amount, LocalDateTime paidAt, String note, boolean wallet) {}
}
