package com.finance.finance.modules.goal.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContributeResponse {
    
    private UUID contributionId;
    private UUID goalId;
    private BigDecimal amount;
    private BigDecimal newCurrentAmount;
    private Double newPercentage;
    private BigDecimal remaining;
    private LocalDateTime contributedAt;
}
