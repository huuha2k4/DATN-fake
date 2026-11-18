package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreateMoneyRequest {
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    @NotBlank private String description;
}
