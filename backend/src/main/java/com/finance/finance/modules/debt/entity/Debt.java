package com.finance.finance.modules.debt.entity;

import com.finance.finance.common.enums.DebtStatus;
import com.finance.finance.common.enums.DebtType;
import com.finance.finance.common.enums.InterestType;
import com.finance.finance.common.enums.PaymentFrequency;
import com.finance.finance.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity cho khoản nợ (vay/cho vay)
 */
@Entity
@Table(name = "debts", indexes = {
        @Index(name = "idx_debts_user_id", columnList = "user_id"),
        @Index(name = "idx_debts_type", columnList = "debt_type"),
        @Index(name = "idx_debts_status", columnList = "status"),
        @Index(name = "idx_debts_due_date", columnList = "due_date"),
        @Index(name = "idx_debts_user_status", columnList = "user_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Debt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "debt_type", nullable = false, length = 20)
    private DebtType debtType;

    // ==================== Creditor/Debtor Info ====================
    
    /**
     * Tên người cho vay (khi debt_type = BORROWING)
     */
    @Column(name = "creditor_name", length = 255)
    private String creditorName;

    @Column(name = "creditor_phone", length = 20)
    private String creditorPhone;

    @Column(name = "creditor_email", length = 255)
    private String creditorEmail;

    /**
     * Tên người đi vay (khi debt_type = LENDING)
     */
    @Column(name = "debtor_name", length = 255)
    private String debtorName;

    @Column(name = "debtor_phone", length = 20)
    private String debtorPhone;

    @Column(name = "debtor_email", length = 255)
    private String debtorEmail;

    // ==================== Amount Info ====================

    /**
     * Số tiền gốc ban đầu
     */
    @Column(name = "principal_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal principalAmount;

    /**
     * Tổng số tiền đã trả (cả gốc và lãi)
     */
    @Column(name = "paid_amount", nullable = false, precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    /**
     * Tổng lãi đã trả
     */
    @Column(name = "interest_paid", precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal interestPaid = BigDecimal.ZERO;

    @Column(name = "currency_code", nullable = false, length = 3)
    @Builder.Default
    private String currencyCode = "VND";

    // ==================== Interest Info ====================

    /**
     * Lãi suất (%/năm)
     */
    @Column(name = "interest_rate", precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_type", length = 20)
    private InterestType interestType;

    // ==================== Payment Schedule ====================

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_frequency", length = 20)
    private PaymentFrequency paymentFrequency;

    /**
     * Số tiền trả định kỳ (nếu có)
     */
    @Column(name = "payment_amount", precision = 19, scale = 4)
    private BigDecimal paymentAmount;

    /**
     * Ngày trả tiếp theo
     */
    @Column(name = "next_payment_date")
    private LocalDate nextPaymentDate;

    // ==================== Dates ====================

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DebtStatus status = DebtStatus.ACTIVE;

    // ==================== Associated Entities ====================

    /**
     * Tài khoản liên kết (để trả nợ)
     */
    @Column(name = "account_id")
    private UUID accountId;

    /**
     * Category cho các giao dịch trả nợ
     */
    @Column(name = "category_id")
    private UUID categoryId;

    // ==================== Reminder Settings ====================

    @Column(name = "reminder_enabled", nullable = false)
    @Builder.Default
    private Boolean reminderEnabled = false;

    @Column(name = "reminder_days_before")
    private Integer reminderDaysBefore;

    // ==================== Additional Info ====================

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String note;

    /**
     * Đường dẫn file đính kèm (hợp đồng, giấy tờ)
     */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    // ==================== Metadata ====================

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 0;

    // ==================== Relationships ====================

    @OneToMany(mappedBy = "debt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DebtPayment> payments = new ArrayList<>();

    // ==================== Helper Methods ====================

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Soft delete
     */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.status = DebtStatus.CANCELLED;
    }

    /**
     * Tính số tiền còn lại phải trả
     */
    public BigDecimal getRemainingAmount() {
        return principalAmount.subtract(paidAmount.subtract(interestPaid));
    }

    /**
     * Tính phần trăm đã trả
     */
    public int getPercentagePaid() {
        if (principalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        BigDecimal principalPaid = paidAmount.subtract(interestPaid);
        return principalPaid.multiply(BigDecimal.valueOf(100))
                .divide(principalAmount, 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /**
     * Tính số tháng còn lại (từ hôm nay đến due_date)
     */
    public Long getMonthsRemaining() {
        if (dueDate == null) {
            return null;
        }
        return ChronoUnit.MONTHS.between(LocalDate.now(), dueDate);
    }

    /**
     * Tính tổng số tháng (từ start_date đến due_date)
     */
    public Long getTotalMonths() {
        if (dueDate == null) {
            return null;
        }
        return ChronoUnit.MONTHS.between(startDate, dueDate);
    }

    /**
     * Tính số tháng đã trả
     */
    public Long getMonthsPaid() {
        Long total = getTotalMonths();
        Long remaining = getMonthsRemaining();
        if (total == null || remaining == null) {
            return null;
        }
        return total - remaining;
    }

    /**
     * Kiểm tra có phải là nợ đi vay không
     */
    public boolean isBorrowing() {
        return DebtType.BORROWING.equals(this.debtType);
    }

    /**
     * Kiểm tra có phải là nợ cho vay không
     */
    public boolean isLending() {
        return DebtType.LENDING.equals(this.debtType);
    }

    /**
     * Kiểm tra có đang active không
     */
    public boolean isActive() {
        return DebtStatus.ACTIVE.equals(this.status);
    }

    /**
     * Kiểm tra đã trả hết chưa
     */
    public boolean isPaidOff() {
        return DebtStatus.PAID_OFF.equals(this.status);
    }

    /**
     * Kiểm tra có quá hạn không
     */
    public boolean isOverdue() {
        if (dueDate == null || !isActive()) {
            return false;
        }
        return LocalDate.now().isAfter(dueDate);
    }

    /**
     * Cập nhật trạng thái dựa trên số tiền đã trả và due date
     */
    public void updateStatus() {
        BigDecimal remaining = getRemainingAmount();
        
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            this.status = DebtStatus.PAID_OFF;
        } else if (isOverdue()) {
            this.status = DebtStatus.OVERDUE;
        } else {
            this.status = DebtStatus.ACTIVE;
        }
    }

    /**
     * Ghi nhận một khoản thanh toán
     */
    public void recordPayment(BigDecimal totalAmount, BigDecimal principalPaid, BigDecimal interestPaidAmount) {
        this.paidAmount = this.paidAmount.add(totalAmount);
        if (interestPaidAmount != null) {
            this.interestPaid = this.interestPaid.add(interestPaidAmount);
        }
        updateStatus();
    }

    /**
     * Lấy tên người liên quan (creditor hoặc debtor)
     */
    public String getRelatedPartyName() {
        return isBorrowing() ? creditorName : debtorName;
    }
}
