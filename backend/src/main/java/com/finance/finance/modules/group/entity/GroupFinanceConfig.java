package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_finance_configs", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupFinanceConfig {
    @Id @Column(name = "group_id") private UUID groupId;
    @Column(name = "use_shared_fund", nullable = false) private boolean useSharedFund;
    @Column(name = "use_contribution_periods", nullable = false) private boolean useContributionPeriods;
    @Column(name = "allow_member_splits", nullable = false) private boolean allowMemberSplits;
    @Column(name = "allow_debt_simplification", nullable = false) private boolean allowDebtSimplification;
    @Column(name = "allow_fund_reimbursements", nullable = false) private boolean allowFundReimbursements;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Version @Column(nullable = false) @Builder.Default private Long version = 0L;
}
