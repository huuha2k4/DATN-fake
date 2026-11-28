package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.FundReimbursementStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fund_reimbursements", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FundReimbursement {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "group_id", nullable = false) private UUID groupId;
    @Column(name = "expense_id", nullable = false, unique = true) private UUID expenseId;
    @Column(name = "beneficiary_user_id", nullable = false) private UUID beneficiaryUserId;
    @Column(name = "authorized_account_id") private UUID authorizedAccountId;
    @Column(name = "total_amount", nullable = false, precision = 19, scale = 4) private BigDecimal totalAmount;
    @Column(name = "reimbursed_amount", nullable = false, precision = 19, scale = 4) private BigDecimal reimbursedAmount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private FundReimbursementStatus status;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Column(name = "cancelled_at") private LocalDateTime cancelledAt;
    @Version @Column(nullable = false) @Builder.Default private Long version = 0L;
}
