package com.finance.finance.modules.account.entity;

import com.finance.finance.common.enums.AccountType;
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
@Table(name = "accounts", indexes = {
    @Index(name = "idx_account_user_id", columnList = "user_id"),
    @Index(name = "idx_account_type", columnList = "account_type"),
    @Index(name = "idx_account_is_active", columnList = "is_active"),
    @Index(name = "idx_account_deleted_at", columnList = "deleted_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Account {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    private AccountType accountType;
    
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;
    
    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;
    
    // Bank/Institution related fields
    @Column(name = "bank_id")
    private UUID bankId;
    
    @Column(name = "account_number", length = 50)
    private String accountNumber;
    
    @Column(name = "account_number_masked", length = 50)
    private String accountNumberMasked; // e.g., "****7890"
    
    @Column(name = "phone_number", length = 20)
    private String phoneNumber; // For e-wallets
    
    @Column(name = "card_number_last4", length = 4)
    private String cardNumberLast4; // For credit cards
    
    // Credit card specific fields
    @Column(name = "credit_limit", precision = 15, scale = 2)
    private BigDecimal creditLimit;
    
    @Column(name = "billing_cycle_day")
    private Integer billingCycleDay; // 1-31
    
    @Column(name = "payment_due_day")
    private Integer paymentDueDay; // 1-31
    
    // Display & Settings
    @Column(name = "icon", length = 10)
    private String icon;
    
    @Column(name = "color", length = 7)
    private String color; // Hex color code
    
    @Column(name = "description", length = 500)
    private String description;
    
    @Column(name = "display_order")
    private Integer displayOrder;
    
    @Column(name = "is_included_in_total", nullable = false)
    @Builder.Default
    private Boolean isIncludedInTotal = true;
    
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    // Bank sync related
    @Column(name = "is_synced")
    @Builder.Default
    private Boolean isSynced = false;
    
    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;
    
    @Column(name = "sync_seq")
    @Builder.Default
    private Long syncSeq = 0L; // For sync ordering
    
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
        this.isActive = false;
    }
    
    public boolean isCreditCard() {
        return AccountType.CREDIT_CARD.equals(this.accountType);
    }
    
    public BigDecimal getCreditUsed() {
        if (!isCreditCard() || creditLimit == null) {
            return BigDecimal.ZERO;
        }
        return balance.abs();
    }
    
    public BigDecimal getCreditAvailable() {
        if (!isCreditCard() || creditLimit == null) {
            return BigDecimal.ZERO;
        }
        return creditLimit.subtract(getCreditUsed());
    }
    
    public Double getUtilizationPercentage() {
        if (!isCreditCard() || creditLimit == null || creditLimit.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return getCreditUsed().divide(creditLimit, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }
}
