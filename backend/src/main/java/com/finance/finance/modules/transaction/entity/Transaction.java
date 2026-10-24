package com.finance.finance.modules.transaction.entity;

import com.finance.finance.common.enums.CategoryStatus;
import com.finance.finance.common.enums.TransactionSource;
import com.finance.finance.common.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "transactions", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "account_id", nullable = false)
    private UUID accountId;
    
    @Column(name = "to_account_id")
    private UUID toAccountId;
    
    @Column(name = "category_id")
    private UUID categoryId;
    
    @Column(name = "merchant_id")
    private UUID merchantId;
    
    @Column(name = "receipt_id")
    private UUID receiptId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TransactionType type;
    
    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;
    
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;
    
    @Column(name = "exchange_rate", nullable = false, precision = 18, scale = 8)
    @Builder.Default
    private BigDecimal exchangeRate = BigDecimal.ONE;
    
    @Column(name = "is_rate_estimated", nullable = false)
    @Builder.Default
    private boolean isRateEstimated = false;
    
    @Column(name = "base_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal baseAmount;
    
    @Column(name = "fee_amount", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal feeAmount = BigDecimal.ZERO;
    
    @Column(name = "base_fee", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal baseFee = BigDecimal.ZERO;
    
    @Column(name = "to_amount", precision = 19, scale = 4)
    private BigDecimal toAmount;
    
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    
    @Column(name = "occurred_date", nullable = false)
    private LocalDate occurredDate;
    
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
    
    @Column(name = "description_raw", columnDefinition = "TEXT")
    private String descriptionRaw;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    @Builder.Default
    private TransactionSource source = TransactionSource.MANUAL;
    
    @Column(name = "is_excluded_from_report", nullable = false)
    @Builder.Default
    private boolean isExcludedFromReport = false;
    
    @Column(name = "location", columnDefinition = "jsonb")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private String location;
    
    @Column(name = "category_source", length = 20)
    private String categorySource;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category_status", nullable = false)
    @Builder.Default
    private CategoryStatus categoryStatus = CategoryStatus.CONFIRMED;
    
    @Column(name = "ai_confidence", precision = 3, scale = 2)
    private BigDecimal aiConfidence;
    
    @Column(name = "external_id", length = 191)
    private String externalId;
    
    @Column(name = "client_uuid")
    private UUID clientUuid;
    
    @Column(name = "sync_seq")
    private Long syncSeq;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    @Column(name = "deleted_at")
    private Instant deletedAt;
    
    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
    
    // Business methods
    
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void markAsDeleted() {
        this.deletedAt = Instant.now();
    }
    
    public boolean isTransfer() {
        return type == TransactionType.TRANSFER;
    }
    
    public boolean isIncome() {
        return type == TransactionType.INCOME;
    }
    
    public boolean isExpense() {
        return type == TransactionType.EXPENSE;
    }
    
    public boolean hasCategory() {
        return categoryId != null;
    }
    
    public boolean hasMerchant() {
        return merchantId != null;
    }
    
    public boolean hasReceipt() {
        return receiptId != null;
    }
    
    public boolean isExcludedFromReport() {
        return isExcludedFromReport;
    }
}
