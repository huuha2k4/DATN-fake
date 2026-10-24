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
@Table(name = "goal_milestones", indexes = {
    @Index(name = "idx_goal_milestone_goal_id", columnList = "goal_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalMilestone {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;
    
    @Column(name = "name", length = 100)
    private String name;
    
    @Column(name = "percentage", nullable = false)
    private Integer percentage;
    
    @Column(name = "target_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal targetAmount;
    
    @Column(name = "achieved", nullable = false)
    @Builder.Default
    private Boolean achieved = false;
    
    @Column(name = "achieved_at")
    private LocalDateTime achievedAt;
    
    @Column(name = "reward", length = 500)
    private String reward;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Version
    @Column(name = "version")
    private Integer version;
}
