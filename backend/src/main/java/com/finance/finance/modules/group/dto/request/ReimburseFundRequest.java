package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ReimburseFundRequest {
    private boolean useAuthorizedWallet;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    private UUID destinationAccountId;
    @Size(max = 1000) private String note;
}
