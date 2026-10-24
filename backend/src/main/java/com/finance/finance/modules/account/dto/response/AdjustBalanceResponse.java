package com.finance.finance.modules.account.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdjustBalanceResponse {
    
    private UUID accountId;
    private BigDecimal oldBalance;
    private BigDecimal newBalance;
    private BigDecimal adjustmentAmount;
    private UUID adjustmentTransactionId;
    private String reason;
}
