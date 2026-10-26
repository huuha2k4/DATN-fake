package com.finance.finance.modules.debt.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.InterestType;
import com.finance.finance.common.enums.PaymentFrequency;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Request DTO để cập nhật khoản nợ
 * Tất cả fields đều optional - chỉ cập nhật những field được gửi lên
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDebtRequest {

    // ==================== Creditor/Debtor Info ====================

    @JsonProperty("creditor_name")
    @Size(max = 255, message = "Creditor name must not exceed 255 characters")
    private String creditorName;

    @JsonProperty("creditor_phone")
    @Size(max = 20, message = "Creditor phone must not exceed 20 characters")
    private String creditorPhone;

    @JsonProperty("creditor_email")
    @Email(message = "Invalid creditor email format")
    @Size(max = 255, message = "Creditor email must not exceed 255 characters")
    private String creditorEmail;

    @JsonProperty("debtor_name")
    @Size(max = 255, message = "Debtor name must not exceed 255 characters")
    private String debtorName;

    @JsonProperty("debtor_phone")
    @Size(max = 20, message = "Debtor phone must not exceed 20 characters")
    private String debtorPhone;

    @JsonProperty("debtor_email")
    @Email(message = "Invalid debtor email format")
    @Size(max = 255, message = "Debtor email must not exceed 255 characters")
    private String debtorEmail;

    // ==================== Interest Info ====================

    @JsonProperty("interest_rate")
    @DecimalMin(value = "0", message = "Interest rate must be 0 or positive")
    @DecimalMax(value = "100", message = "Interest rate must not exceed 100%")
    @Digits(integer = 3, fraction = 2, message = "Interest rate must have maximum 3 integer digits and 2 decimal places")
    private BigDecimal interestRate;

    @JsonProperty("interest_type")
    private InterestType interestType;

    // ==================== Payment Schedule ====================

    @JsonProperty("payment_frequency")
    private PaymentFrequency paymentFrequency;

    @JsonProperty("payment_amount")
    @DecimalMin(value = "0", message = "Payment amount must be positive")
    @Digits(integer = 15, fraction = 4, message = "Payment amount must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal paymentAmount;

    @JsonProperty("next_payment_date")
    private LocalDate nextPaymentDate;

    @JsonProperty("due_date")
    private LocalDate dueDate;

    // ==================== Associated Entities ====================

    @JsonProperty("account_id")
    private UUID accountId;

    @JsonProperty("category_id")
    private UUID categoryId;

    // ==================== Reminder Settings ====================

    @JsonProperty("reminder_enabled")
    private Boolean reminderEnabled;

    @JsonProperty("reminder_days_before")
    @Min(value = 0, message = "Reminder days before must be positive")
    @Max(value = 365, message = "Reminder days before must not exceed 365 days")
    private Integer reminderDaysBefore;

    // ==================== Additional Info ====================

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Size(max = 1000, message = "Note must not exceed 1000 characters")
    private String note;

    @JsonProperty("attachment_url")
    @Size(max = 500, message = "Attachment URL must not exceed 500 characters")
    private String attachmentUrl;

    /**
     * Kiểm tra xem request có data để update không
     */
    public boolean hasUpdates() {
        return creditorName != null || creditorPhone != null || creditorEmail != null
                || debtorName != null || debtorPhone != null || debtorEmail != null
                || interestRate != null || interestType != null
                || paymentFrequency != null || paymentAmount != null || nextPaymentDate != null
                || dueDate != null || accountId != null || categoryId != null
                || reminderEnabled != null || reminderDaysBefore != null
                || description != null || note != null || attachmentUrl != null;
    }
}
