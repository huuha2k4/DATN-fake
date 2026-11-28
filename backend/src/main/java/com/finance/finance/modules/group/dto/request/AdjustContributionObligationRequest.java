package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdjustContributionObligationRequest(@NotNull BigDecimal amount, boolean exempt,
                                                   @NotBlank @Size(max = 300) String reason) {}
