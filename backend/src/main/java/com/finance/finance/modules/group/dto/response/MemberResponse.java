package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {
    private UUID groupId;
    private UUID userId;
    private String role;
    private BigDecimal contributionRatio;
    private BigDecimal balance;
    private BigDecimal totalPaid;
    private BigDecimal totalOwed;
    private Integer expenseCount;
    private Integer settlementCount;
    private LocalDateTime joinedAt;
    private UserSummary user;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private UUID id;
        private String fullName;
        private String displayName;
        private String email;
        private String avatarKey;
    }
}
