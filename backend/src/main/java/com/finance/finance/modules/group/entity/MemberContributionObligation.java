package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "member_contribution_obligations", schema = "core")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MemberContributionObligation {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "period_id", nullable = false) private UUID periodId;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "required_amount", nullable = false, precision = 19, scale = 4) private BigDecimal requiredAmount;
    @Column(name = "allocation_percentage", precision = 7, scale = 4) private BigDecimal allocationPercentage;
    @Column(nullable = false) private boolean exempt;
    @Column(name = "exemption_reason", length = 300) private String exemptionReason;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Version @Column(nullable = false) @Builder.Default private Long version = 0L;
}
