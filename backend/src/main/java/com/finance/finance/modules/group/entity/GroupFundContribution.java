package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.ContributionSourceType;
import com.finance.finance.common.enums.ContributionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_fund_contributions", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupFundContribution {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "fund_id", nullable = false) private UUID fundId;
    @Column(name = "contributor_user_id", nullable = false) private UUID contributorUserId;
    @Column(name = "source_account_id") private UUID sourceAccountId;
    @Column(name = "personal_transaction_id") private UUID personalTransactionId;
    @Column(name = "period_id") private UUID periodId;
    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false)
    @Builder.Default private ContributionSourceType sourceType = ContributionSourceType.MANAGED_ACCOUNT;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    @Builder.Default private ContributionStatus status = ContributionStatus.CONFIRMED;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @Column(name = "contributed_at", nullable = false) private LocalDate contributedAt;
    @Column(columnDefinition = "text") private String note;
    @Column(name = "confirmed_by_user_id") private UUID confirmedByUserId;
    @Column(name = "confirmed_at") private LocalDateTime confirmedAt;
    @Column(name = "rejected_by_user_id") private UUID rejectedByUserId;
    @Column(name = "rejected_at") private LocalDateTime rejectedAt;
    @Column(name = "rejection_reason") private String rejectionReason;
    @Column(name = "idempotency_key", length = 100) private String idempotencyKey;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Version @Column(nullable = false) @Builder.Default private Long version = 0L;
}
