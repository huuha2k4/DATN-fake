package com.finance.finance.modules.budget.entity;

import com.finance.finance.common.enums.AlertLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "budget_items", indexes = {
    @Index(name = "idx_budget_item_budget_id", columnList = "budget_id"),
    @Index(name = "idx_budget_item_category_id", columnList = "category_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_budget_category", columnNames = {"budget_id", "category_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = false)
    private Budget budget;
    
    @Column(name = "category_id", nullable = false)
    private UUID categoryId;
    
    @Column(name = "name", length = 100)
    private String name;
    
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "alert_threshold_percentage", nullable = false)
    @Builder.Default
    private Integer alertThresholdPercentage = 80;
    
    // Cached calculated fields (updated periodically)
    @Column(name = "spent_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal spentAmount = BigDecimal.ZERO;
    
    @Column(name = "remaining", precision = 15, scale = 2)
    private BigDecimal remaining;
    
    @Column(name = "percentage_used")
    private Double percentageUsed;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "alert_level", length = 20)
    @Builder.Default
    private AlertLevel alertLevel = AlertLevel.OK;
    
    @Column(name = "transaction_count")
    @Builder.Default
    private Integer transactionCount = 0;
    
    @Column(name = "last_calculated_at")
    private LocalDateTime lastCalculatedAt;
    
    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Optimistic locking
    @Version
    @Column(name = "version")
    private Integer version;
    
    // Helper methods
    public void calculateAndUpdateStatus() {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            this.percentageUsed = 0.0;
            this.remaining = amount;
            this.alertLevel = AlertLevel.OK;
            return;
        }
        
        if (spentAmount == null) {
            spentAmount = BigDecimal.ZERO;
        }
        
        this.remaining = amount.subtract(spentAmount);
        this.percentageUsed = spentAmount.divide(amount, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
        
        // Update alert level
        if (percentageUsed > 100) {
            this.alertLevel = AlertLevel.CRITICAL;
        } else if (percentageUsed >= alertThresholdPercentage) {
            this.alertLevel = AlertLevel.WARNING;
        } else {
            this.alertLevel = AlertLevel.OK;
        }
        
        this.lastCalculatedAt = LocalDateTime.now();
    }
    
    public boolean isOnTrack() {
        return alertLevel == AlertLevel.OK;
    }
    
    public boolean isExceeded() {
        return percentageUsed != null && percentageUsed > 100;
    }
}
