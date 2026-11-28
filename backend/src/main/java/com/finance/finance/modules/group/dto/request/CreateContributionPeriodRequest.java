package com.finance.finance.modules.group.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateContributionPeriodRequest {
    @NotBlank @Size(max = 160) private String name;
    @Size(max = 2000) private String description;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate dueDate;
    @NotBlank private String allocationMethod;
    @NotBlank private String frequency;
    @DecimalMin("0.01") private BigDecimal fundraisingTarget;
    @NotEmpty @Valid private List<MemberObligation> members;

    @Data
    public static class MemberObligation {
        @NotNull private UUID userId;
        @NotNull @DecimalMin("0.0") private BigDecimal amount;
        @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal percentage;
        private boolean exempt;
        @Size(max = 300) private String exemptionReason;
    }
}
