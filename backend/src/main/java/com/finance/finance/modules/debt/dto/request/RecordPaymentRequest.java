package com.finance.finance.modules.debt.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Request DTO để ghi nhận trả nợ
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordPaymentRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 15, fraction = 4, message = "Amount must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal amount;

    @JsonProperty("principal_paid")
    @DecimalMin(value = "0", message = "Principal paid must be 0 or positive")
    @Digits(integer = 15, fraction = 4, message = "Principal paid must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal principalPaid;

    @JsonProperty("interest_paid")
    @DecimalMin(value = "0", message = "Interest paid must be 0 or positive")
    @Digits(integer = 15, fraction = 4, message = "Interest paid must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal interestPaid;

    @NotNull(message = "Payment date is required")
    @JsonProperty("payment_date")
    private LocalDate paymentDate;

    @JsonProperty("payment_method")
    @Size(max = 50, message = "Payment method must not exceed 50 characters")
    private String paymentMethod;

    @JsonProperty("account_id")
    private UUID accountId;

    @Size(max = 1000, message = "Note must not exceed 1000 characters")
    private String note;

    @JsonProperty("attachment_url")
    @Size(max = 500, message = "Attachment URL must not exceed 500 characters")
    private String attachmentUrl;

    /**
     * Có tự động tạo transaction không (mặc định true)
     */
    @JsonProperty("create_transaction")
    @Builder.Default
    private Boolean createTransaction = true;

    // ==================== Validation Methods ====================

    /**
     * Validate principal_paid + interest_paid = amount
     */
    @AssertTrue(message = "Principal paid and interest paid must sum to total amount")
    private boolean isAmountValid() {
        if (principalPaid == null && interestPaid == null) {
            return true; // Sẽ được tính tự động
        }
        
        if (principalPaid == null || interestPaid == null) {
            return true; // Một trong hai null thì OK
        }
        
        BigDecimal sum = principalPaid.add(interestPaid);
        return sum.compareTo(amount) == 0;
    }

    /**
     * Validate payment_date không nằm trong tương lai
     */
    @AssertTrue(message = "Payment date cannot be in the future")
    private boolean isPaymentDateValid() {
        if (paymentDate == null) {
            return true;
        }
        return !paymentDate.isAfter(LocalDate.now());
    }
}
