package com.finance.finance.modules.debt.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO cho chi tiết debt với lịch sử payments
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebtDetailResponse {

    private UUID id;

    @JsonProperty("debt_type")
    private com.finance.finance.common.enums.DebtType debtType;

    // Creditor info
    @JsonProperty("creditor_name")
    private String creditorName;

    @JsonProperty("creditor_phone")
    private String creditorPhone;

    @JsonProperty("creditor_email")
    private String creditorEmail;

    // Debtor info
    @JsonProperty("debtor_name")
    private String debtorName;

    @JsonProperty("debtor_phone")
    private String debtorPhone;

    @JsonProperty("debtor_email")
    private String debtorEmail;

    // Amount info
    @JsonProperty("principal_amount")
    private java.math.BigDecimal principalAmount;

    @JsonProperty("paid_amount")
    private java.math.BigDecimal paidAmount;

    @JsonProperty("remaining_amount")
    private java.math.BigDecimal remainingAmount;

    @JsonProperty("percentage_paid")
    private Integer percentagePaid;

    @JsonProperty("interest_paid")
    private java.math.BigDecimal interestPaid;

    // Interest info
    @JsonProperty("interest_rate")
    private java.math.BigDecimal interestRate;

    @JsonProperty("interest_type")
    private com.finance.finance.common.enums.InterestType interestType;

    @JsonProperty("currency_code")
    private String currencyCode;

    @JsonProperty("payment_frequency")
    private com.finance.finance.common.enums.PaymentFrequency paymentFrequency;

    @JsonProperty("payment_amount")
    private java.math.BigDecimal paymentAmount;

    @JsonProperty("next_payment_date")
    private LocalDate nextPaymentDate;

    private com.finance.finance.common.enums.DebtStatus status;

    // Dates
    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("due_date")
    private LocalDate dueDate;

    @JsonProperty("months_total")
    private Long monthsTotal;

    @JsonProperty("months_paid")
    private Long monthsPaid;

    @JsonProperty("months_remaining")
    private Long monthsRemaining;

    // Associated entities
    private AccountInfo account;
    private CategoryInfo category;

    // Reminder
    @JsonProperty("reminder_enabled")
    private Boolean reminderEnabled;

    @JsonProperty("reminder_days_before")
    private Integer reminderDaysBefore;

    // Additional info
    private String description;
    private String note;

    @JsonProperty("attachment_url")
    private String attachmentUrl;

    // Payment history
    @JsonProperty("payment_history")
    private List<PaymentHistoryItem> paymentHistory;

    private Integer version;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    // ==================== Nested Classes ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AccountInfo {
        private UUID id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CategoryInfo {
        private UUID id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PaymentHistoryItem {
        private UUID id;
        private java.math.BigDecimal amount;

        @JsonProperty("principal_paid")
        private java.math.BigDecimal principalPaid;

        @JsonProperty("interest_paid")
        private java.math.BigDecimal interestPaid;

        @JsonProperty("payment_date")
        private LocalDate paymentDate;

        @JsonProperty("payment_method")
        private String paymentMethod;

        private String note;

        @JsonProperty("transaction_id")
        private UUID transactionId;
    }
}
