package com.finance.finance.modules.goal.entity;

import com.finance.finance.common.enums.*;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "goals", indexes = {
    @Index(name = "idx_goal_user_id", columnList = "user_id"),
    @Index(name = "idx_goal_status", columnList = "status"),
    @Index(name = "idx_goal_target_date", columnList = "target_date"),
    @Index(name = "idx_goal_deleted_at", columnList = "deleted_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Goal {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 200)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "goal_type", nullable = false, length = 20)
    private GoalType goalType;
    
    @Column(name = "target_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal targetAmount;
    
    @Column(name = "current_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal currentAmount = BigDecimal.ZERO;
    
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;
    
    @Column(name = "target_date")
    private LocalDate targetDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private GoalStatus status = GoalStatus.IN_PROGRESS;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 10)
    @Builder.Default
    private GoalPriority priority = GoalPriority.MEDIUM;
    
    @Column(name = "icon", length = 10)
    private String icon;
    
    @Column(name = "color", length = 7)
    private String color;
    
    @Column(name = "description", length = 1000)
    private String description;
    
    // Auto save settings
    @Column(name = "auto_save_enabled", nullable = false)
    @Builder.Default
    private Boolean autoSaveEnabled = false;
    
    @Column(name = "auto_save_amount", precision = 15, scale = 2)
    private BigDecimal autoSaveAmount;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "auto_save_frequency", length = 20)
    private AutoSaveFrequency autoSaveFrequency;
    
    @Column(name = "next_contribution_date")
    private LocalDate nextContributionDate;
    
    @Column(name = "account_id")
    private UUID accountId;
    
    // Completion tracking
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "completed_note", length = 500)
    private String completedNote;
    
    @Column(name = "actual_amount_used", precision = 15, scale = 2)
    private BigDecimal actualAmountUsed;
    
    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @Version
    @Column(name = "version")
    private Integer version;
    
    // Relationships
    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GoalContribution> contributions = new ArrayList<>();
    
    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GoalMilestone> milestones = new ArrayList<>();
    
    // Helper methods
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.status = GoalStatus.CANCELLED;
    }
    
    public BigDecimal getRemaining() {
        return targetAmount.subtract(currentAmount);
    }
    
    public Double getPercentageComplete() {
        if (targetAmount.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return currentAmount.divide(targetAmount, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }
    
    public Integer getDaysRemaining() {
        if (targetDate == null) return null;
        long days = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        return (int) Math.max(0, days);
    }
    
    public Integer getDaysTotal() {
        if (targetDate == null || createdAt == null) return null;
        return (int) ChronoUnit.DAYS.between(createdAt.toLocalDate(), targetDate);
    }
    
    public Integer getDaysElapsed() {
        if (createdAt == null) return null;
        return (int) ChronoUnit.DAYS.between(createdAt.toLocalDate(), LocalDate.now());
    }
    
    public BigDecimal getSuggestedMonthlySaving() {
        if (targetDate == null) return BigDecimal.ZERO;
        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        if (daysRemaining <= 0) return BigDecimal.ZERO;
        
        BigDecimal remaining = getRemaining();
        double monthsRemaining = daysRemaining / 30.0;
        
        return remaining.divide(BigDecimal.valueOf(monthsRemaining), 0, RoundingMode.HALF_UP);
    }
    
    public void addContribution(GoalContribution contribution) {
        contributions.add(contribution);
        contribution.setGoal(this);
        this.currentAmount = this.currentAmount.add(contribution.getAmount());
    }
    
    public void addMilestone(GoalMilestone milestone) {
        milestones.add(milestone);
        milestone.setGoal(this);
    }
    
    public void complete(String note, BigDecimal actualAmountUsed) {
        this.status = GoalStatus.ACHIEVED;
        this.completedAt = LocalDateTime.now();
        this.completedNote = note;
        this.actualAmountUsed = actualAmountUsed;
    }
}
