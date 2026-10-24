package com.finance.finance.modules.budget.entity;

import com.finance.finance.common.enums.BudgetPeriodType;
import com.finance.finance.common.enums.BudgetStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "budgets", indexes = {
    @Index(name = "idx_budget_user_id", columnList = "user_id"),
    @Index(name = "idx_budget_period", columnList = "start_date,end_date"),
    @Index(name = "idx_budget_status", columnList = "status"),
    @Index(name = "idx_budget_deleted_at", columnList = "deleted_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Budget {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "period_type", nullable = false, length = 20)
    private BudgetPeriodType periodType;
    
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
    
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;
    
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BudgetStatus status = BudgetStatus.ON_TRACK;
    
    @Column(name = "rollover_enabled", nullable = false)
    @Builder.Default
    private Boolean rolloverEnabled = false;
    
    @Column(name = "alert_threshold_percentage", nullable = false)
    @Builder.Default
    private Integer alertThresholdPercentage = 80;
    
    // Cached calculated fields (updated periodically)
    @Column(name = "spent_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal spentAmount = BigDecimal.ZERO;
    
    @Column(name = "remaining_amount", precision = 15, scale = 2)
    private BigDecimal remainingAmount;
    
    @Column(name = "percentage_used")
    private Double percentageUsed;
    
    @Column(name = "last_calculated_at")
    private LocalDateTime lastCalculatedAt;
    
    // One-to-many relationship with BudgetItem
    @OneToMany(mappedBy = "budget", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BudgetItem> items = new ArrayList<>();
    
    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    // Optimistic locking
    @Version
    @Column(name = "version")
    private Integer version;
    
    // Helper methods
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
    
    public boolean isActive() {
        LocalDate now = LocalDate.now();
        return !isDeleted() && !now.isBefore(startDate) && !now.isAfter(endDate);
    }
    
    public boolean isPast() {
        return LocalDate.now().isAfter(endDate);
    }
    
    public boolean isFuture() {
        return LocalDate.now().isBefore(startDate);
    }
    
    public void addItem(BudgetItem item) {
        items.add(item);
        item.setBudget(this);
    }
    
    public void removeItem(BudgetItem item) {
        items.remove(item);
        item.setBudget(null);
    }
    
    public void calculateAndUpdateStatus() {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            this.percentageUsed = 0.0;
            this.remainingAmount = totalAmount;
            this.status = BudgetStatus.ON_TRACK;
            return;
        }
        
        if (spentAmount == null) {
            spentAmount = BigDecimal.ZERO;
        }
        
        this.remainingAmount = totalAmount.subtract(spentAmount);
        this.percentageUsed = spentAmount.divide(totalAmount, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
        
        // Update status based on percentage and date
        if (isPast()) {
            this.status = BudgetStatus.COMPLETED;
        } else if (percentageUsed > 100) {
            this.status = BudgetStatus.EXCEEDED;
        } else if (percentageUsed >= alertThresholdPercentage) {
            this.status = BudgetStatus.WARNING;
        } else {
            this.status = BudgetStatus.ON_TRACK;
        }
        
        this.lastCalculatedAt = LocalDateTime.now();
    }
}
