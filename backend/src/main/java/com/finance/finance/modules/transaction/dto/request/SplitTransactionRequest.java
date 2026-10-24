package com.finance.finance.modules.transaction.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SplitTransactionRequest {
    
    @NotEmpty(message = "Splits list cannot be empty")
    @Size(min = 2, message = "Must split into at least 2 transactions")
    @Valid
    private List<SplitItem> splits;
    
    @Builder.Default
    private Boolean deleteOriginal = true;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SplitItem {
        
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        private BigDecimal amount;
        
        @NotNull(message = "Description is required")
        @Size(min = 1, max = 500, message = "Description must be between 1 and 500 characters")
        private String description;
        
        @NotNull(message = "Category ID is required")
        private UUID categoryId;
        
        @Size(max = 1000, message = "Note must not exceed 1000 characters")
        private String note;
    }
}
