package com.finance.finance.modules.debt.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity lưu lịch sử trả nợ
 */
@Entity
@Table(name = "debt_payments", indexes = {
        @Index(name = "idx_debt_payments_debt_id", columnList = "debt_id"),
        @Index(name = "idx_debt_payments_payment_date", columnList = "payment_date"),
        @Index(name = "idx_debt_payments_debt_date", columnList = "debt_id, payment_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DebtPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_id", nullable = false)
    private Debt debt;

    /**
     * Tổng số tiền trả (gốc + lãi)
     */
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    /**
     * Phần tiền gốc được trả
     */
    @Column(name = "principal_paid", precision = 19, scale = 4)
    private BigDecimal principalPaid;

    /**
     * Phần lãi được trả
     */
    @Column(name = "interest_paid", precision = 19, scale = 4)
    private BigDecimal interestPaid;

    /**
     * Ngày trả nợ
     */
    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    /**
     * Phương thức thanh toán
     */
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    /**
     * Tài khoản dùng để trả (nếu có)
     */
    @Column(name = "account_id")
    private UUID accountId;

    /**
     * Transaction ID được tạo ra (nếu có)
     */
    @Column(name = "transaction_id")
    private UUID transactionId;

    /**
     * Ghi chú cho khoản thanh toán này
     */
    @Column(columnDefinition = "TEXT")
    private String note;

    /**
     * Đường dẫn file đính kèm (biên lai, hóa đơn)
     */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 0;

    // ==================== Helper Methods ====================

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Tính số tiền còn lại của debt sau khi trả
     */
    public BigDecimal getRemainingAfterPayment() {
        if (debt == null) {
            return null;
        }
        return debt.getRemainingAmount();
    }
}
