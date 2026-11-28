package com.finance.finance.modules.group.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class ContributionPeriodResponse {
    private UUID id;
    private UUID groupId;
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String allocationMethod;
    private String frequency;
    private String status;
    private BigDecimal requiredTotal;
    private BigDecimal fundraisingTarget;
    private BigDecimal confirmedAmount;
    private BigDecimal completedObligationAmount;
    private BigDecimal pendingAmount;
    private BigDecimal outstandingAmount;
    private BigDecimal excessAmount;
    private BigDecimal obligationProgressPercent;
    private BigDecimal fundraisingProgressPercent;
    private long completedMembers;
    private long incompleteMembers;
    private List<MemberProgress> members;

    @Data @Builder
    public static class MemberProgress {
        private UUID userId;
        private String fullName;
        private String avatarUrl;
        private BigDecimal requiredAmount;
        private BigDecimal confirmedAmount;
        private BigDecimal pendingAmount;
        private BigDecimal outstandingAmount;
        private BigDecimal excessAmount;
        private boolean exempt;
        private boolean overdue;
        private String status;
    }
}
