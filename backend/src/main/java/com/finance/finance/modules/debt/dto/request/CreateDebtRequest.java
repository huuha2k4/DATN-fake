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
 * Request DTO để tạo khoản nợ mới
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDebtRequest {

    @NotBlank(message = "Debt type is required")
    @Pattern(regexp = "BORROWING|LENDING", message = "Debt type must be BORROWING or LENDING")
    @JsonProperty("debt_type")
    private String debtType;

    // ==================== Creditor Info (for BORROWING) ====================

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

    // ==================== Debtor Info (for LENDING) ====================

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

    // ==================== Amount Info ====================

    @NotNull(message = "Principal amount is required")
    @DecimalMin(value = "0.01", message = "Principal amount must be greater than 0")
    @Digits(integer = 15, fraction = 4, message = "Principal amount must have maximum 15 integer digits and 4 decimal places")
    @JsonProperty("principal_amount")
    private BigDecimal principalAmount;

    @NotBlank(message = "Currency code is required")
    @Size(min = 3, max = 3, message = "Currency code must be 3 characters")
    @JsonProperty("currency_code")
    private String currencyCode;

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

    @JsonProperty("monthly_payment")
    @com.fasterxml.jackson.annotation.JsonAlias({"payment_amount", "paymentAmount"})
    @DecimalMin(value = "0", message = "Payment amount must be positive")
    @Digits(integer = 15, fraction = 4, message = "Payment amount must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal monthlyPayment; // Hoặc payment_amount tùy frequency

    @JsonProperty("next_payment_date")
    private LocalDate nextPaymentDate;

    // ==================== Dates ====================

    @NotNull(message = "Start date is required")
    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("due_date")
    private LocalDate dueDate;

    // ==================== Associated Entities ====================

    @JsonProperty("account_id")
    private UUID accountId;

    @JsonProperty("category_id")
    private UUID categoryId;

    // ==================== Reminder Settings ====================

    @JsonProperty("reminder_enabled")
    @Builder.Default
    private Boolean reminderEnabled = false;

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

    // ==================== Validation Methods ====================

    /**
     * Validate due_date phải sau start_date
     */
    @AssertTrue(message = "Due date must be after start date")
    private boolean isDueDateValid() {
        if (dueDate == null) {
            return true;
        }
        return dueDate.isAfter(startDate);
    }

    /**
     * Validate BORROWING phải có creditor_name
     */
    @AssertTrue(message = "Creditor name is required for BORROWING debt")
    private boolean isCreditorValid() {
        if (!"BORROWING".equals(debtType)) {
            return true;
        }
        return creditorName != null && !creditorName.isBlank();
    }

    /**
     * Validate LENDING phải có debtor_name
     */
    @AssertTrue(message = "Debtor name is required for LENDING debt")
    private boolean isDebtorValid() {
        if (!"LENDING".equals(debtType)) {
            return true;
        }
        return debtorName != null && !debtorName.isBlank();
    }

    public boolean isBorrowing() {
        return "BORROWING".equals(debtType);
    }

    public boolean isLending() {
        return "LENDING".equals(debtType);
    }
}
