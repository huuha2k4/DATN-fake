package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ContributeGroupFundRequest {
    @NotNull private UUID sourceAccountId;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    @NotNull private LocalDate contributedAt;
    @Size(max = 1000) private String note;
}
