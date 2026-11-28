package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fund_reimbursement_payments", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FundReimbursementPayment {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "reimbursement_id", nullable = false) private UUID reimbursementId;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @Column(name = "destination_account_id") private UUID destinationAccountId;
    @Column(name = "personal_transaction_id") private UUID personalTransactionId;
    @Column(name = "paid_by_user_id", nullable = false) private UUID paidByUserId;
    @CreationTimestamp @Column(name = "paid_at", nullable = false, updatable = false) private LocalDateTime paidAt;
    @Column(columnDefinition = "text") private String note;
    @Column(name = "idempotency_key", length = 100) private String idempotencyKey;
}
