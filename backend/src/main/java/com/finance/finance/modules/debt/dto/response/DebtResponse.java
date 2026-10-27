package com.finance.finance.modules.debt.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO cho debt (create, update operations)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebtResponse {

    private UUID id;

    @JsonProperty("debt_type")
    private com.finance.finance.common.enums.DebtType debtType;

    @JsonProperty("creditor_name")
    private String creditorName;

    @JsonProperty("debtor_name")
    private String debtorName;

    @JsonProperty("principal_amount")
    private java.math.BigDecimal principalAmount;

    @JsonProperty("paid_amount")
    private java.math.BigDecimal paidAmount;

    @JsonProperty("remaining_amount")
    private java.math.BigDecimal remainingAmount;

    @JsonProperty("percentage_paid")
    private Integer percentagePaid;

    @JsonProperty("interest_rate")
    private java.math.BigDecimal interestRate;

    private com.finance.finance.common.enums.DebtStatus status;

    @JsonProperty("start_date")
    private LocalDate startDate;

    @JsonProperty("due_date")
    private LocalDate dueDate;

    @JsonProperty("months_remaining")
    private Long monthsRemaining;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
