package com.finance.finance.modules.debt.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Response DTO for recording debt payment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {

    @JsonProperty("payment_id")
    private UUID paymentId;

    @JsonProperty("debt_id")
    private UUID debtId;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("principal_paid")
    private BigDecimal principalPaid;

    @JsonProperty("interest_paid")
    private BigDecimal interestPaid;

    @JsonProperty("new_remaining")
    private BigDecimal newRemaining;

    @JsonProperty("new_percentage_paid")
    private Integer newPercentagePaid;

    @JsonProperty("transaction_id")
    private UUID transactionId;

    @JsonProperty("payment_date")
    private LocalDate paymentDate;
}
