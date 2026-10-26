package com.finance.finance.modules.group.dto.response;

import com.finance.finance.modules.group.dto.request.CreateChildWalletRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildWalletResponse {
    private UUID id;
    private UUID groupId;
    private String childName;
    private LocalDate dateOfBirth;
    private Integer age;
    private String avatarKey;
    private BigDecimal balance;
    private String currency;
    private BigDecimal weeklyAllowance;
    private LocalDate nextAllowanceDate;
    private String privacyLevel;
    private BigDecimal spendLimitDaily;
    private BigDecimal spendLimitWeekly;
    private BigDecimal spentToday;
    private BigDecimal spentThisWeek;
    private List<UUID> allowedCategories;
    private BigDecimal requireApprovalAbove;
    private CreateChildWalletRequest.WalletSettingsDto settings;
    private WalletStats stats;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WalletStats {
        private BigDecimal totalSpentThisMonth;
        private Integer pendingRequestCount;
        private Integer approvedRequestCount;
        private Integer rejectedRequestCount;
        private Integer completedChoreCount;
        private BigDecimal totalChoreEarnings;
    }
}
