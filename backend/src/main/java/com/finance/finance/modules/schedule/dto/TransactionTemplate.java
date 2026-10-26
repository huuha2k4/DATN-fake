package com.finance.finance.modules.schedule.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO cho transaction template trong schedule
 * Lưu thông tin mẫu để tạo transaction khi schedule được execute
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TransactionTemplate {

    @NotBlank(message = "Transaction type is required")
    @Pattern(regexp = "INCOME|EXPENSE|TRANSFER", message = "Transaction type must be INCOME, EXPENSE, or TRANSFER")
    @JsonProperty("transaction_type")
    private String transactionType;

    @NotNull(message = "Account ID is required")
    @JsonProperty("account_id")
    private UUID accountId;

    /**
     * Tài khoản đích (chỉ dùng cho TRANSFER)
     */
    @JsonProperty("to_account_id")
    private UUID toAccountId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 15, fraction = 4, message = "Amount must have maximum 15 integer digits and 4 decimal places")
    private BigDecimal amount;

    @NotBlank(message = "Currency code is required")
    @Size(min = 3, max = 3, message = "Currency code must be 3 characters")
    @JsonProperty("currency_code")
    private String currencyCode;

    @JsonProperty("category_id")
    private UUID categoryId;

    @JsonProperty("merchant_id")
    private UUID merchantId;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Size(max = 1000, message = "Note must not exceed 1000 characters")
    private String note;

    // ==================== Helper Methods ====================

    public boolean isTransfer() {
        return "TRANSFER".equals(transactionType);
    }

    public boolean isIncome() {
        return "INCOME".equals(transactionType);
    }

    public boolean isExpense() {
        return "EXPENSE".equals(transactionType);
    }

    /**
     * Validate transfer transaction có toAccountId
     */
    public boolean isValidTransfer() {
        return !isTransfer() || toAccountId != null;
    }
}
