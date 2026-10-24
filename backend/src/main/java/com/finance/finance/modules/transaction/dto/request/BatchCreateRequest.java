package com.finance.finance.modules.transaction.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCreateRequest {
    
    @NotEmpty(message = "Transactions list cannot be empty")
    @Size(max = 100, message = "Cannot create more than 100 transactions at once")
    @Valid
    private List<CreateTransactionRequest> transactions;
    
    @Builder.Default
    private Boolean skipOnError = true;
}
