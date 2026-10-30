package com.finance.finance.modules.group.entity;

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
    @Column(name = "source_account_id", nullable = false) private UUID sourceAccountId;
    @Column(name = "personal_transaction_id") private UUID personalTransactionId;
    @Column(nullable = false, precision = 19, scale = 4) private BigDecimal amount;
    @Column(name = "contributed_at", nullable = false) private LocalDate contributedAt;
    @Column(columnDefinition = "text") private String note;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
}
