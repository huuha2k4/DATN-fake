package com.finance.finance.modules.transaction.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class UpdateTransactionRequest {
    
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @DecimalMax(value = "999999999.99", message = "Amount is too large")
    private BigDecimal amount;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
    
    private LocalDate transactionDate;
    
    private LocalTime transactionTime;
    
    private UUID categoryId;
    
    private UUID merchantId;
    
    private List<UUID> tagIds;
    
    private CreateTransactionRequest.LocationDto location;
    
    @Size(max = 1000, message = "Note must not exceed 1000 characters")
    private String note;
    
    private Boolean isExcludedFromReport;
    
    @NotNull(message = "Version is required for optimistic locking")
    private Long version;
}
