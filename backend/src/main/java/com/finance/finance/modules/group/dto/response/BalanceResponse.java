package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BalanceResponse {
    private List<MemberBalance> balances;
    private List<SimplifiedDebt> simplifiedDebts;
    private BigDecimal totalGroupExpenses;
    private Boolean isFullySettled;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberBalance {
        private UUID userId;
        private BigDecimal balance;
        private BigDecimal totalPaid;
        private BigDecimal totalOwed;
        private BigDecimal personalExpensePaid;
        private BigDecimal fundContribution;
        private BigDecimal fundReserveShare;
        private UserSummary user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SimplifiedDebt {
        private UUID fromUserId;
        private UUID toUserId;
        private BigDecimal amount;
        private UserSummary fromUser;
        private UserSummary toUser;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private String fullName;
        private String avatarKey;
    }
}
