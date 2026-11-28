package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ContributeGroupFundRequest {
    private UUID sourceAccountId;
    private UUID periodId;
    @Pattern(regexp = "MANAGED_ACCOUNT|EXTERNAL_TRANSFER|CASH|OTHER")
    private String sourceType = "MANAGED_ACCOUNT";
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    @NotNull private LocalDate contributedAt;
    @Size(max = 1000) private String note;
}
