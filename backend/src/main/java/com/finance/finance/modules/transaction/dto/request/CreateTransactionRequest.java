package com.finance.finance.modules.transaction.dto.request;

import com.finance.finance.common.enums.TransactionType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTransactionRequest {
    
    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;
    
    @NotNull(message = "Account ID is required")
    private UUID accountId;
    
    // For TRANSFER only
    private UUID toAccountId;
    
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @DecimalMax(value = "999999999.99", message = "Amount is too large")
    private BigDecimal amount;
    
    @NotNull(message = "Currency code is required")
    @Size(min = 3, max = 3, message = "Currency code must be 3 characters")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency code must be uppercase letters")
    private String currencyCode;
    
    // For TRANSFER when currencies differ
    private BigDecimal toAmount;
    private String toCurrencyCode;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
    
    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;
    
    private LocalTime transactionTime;
    
    // Required for INCOME/EXPENSE, null for TRANSFER
    private UUID categoryId;
    
    private UUID merchantId;
    
    private List<UUID> tagIds;
    
    private LocationDto location;
    
    @Size(max = 1000, message = "Note must not exceed 1000 characters")
    private String note;
    
    private Boolean isRecurring;
    
    @DecimalMin(value = "0", message = "Transfer fee must be non-negative")
    private BigDecimal transferFee;
    
    private Boolean isExcludedFromReport;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationDto {
        private Double latitude;
        private Double longitude;
        private String address;
    }
}
