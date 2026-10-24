package com.finance.finance.modules.goal.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "goal_contributions", indexes = {
    @Index(name = "idx_goal_contribution_goal_id", columnList = "goal_id"),
    @Index(name = "idx_goal_contribution_contributed_at", columnList = "contributed_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalContribution {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;
    
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "note", length = 500)
    private String note;
    
    @Column(name = "source_account_id")
    private UUID sourceAccountId;
    
    @Column(name = "contributed_at", nullable = false)
    @CreationTimestamp
    private LocalDateTime contributedAt;
    
    @Version
    @Column(name = "version")
    private Integer version;
}
