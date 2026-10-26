package com.finance.finance.modules.debt.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for debt payment schedule
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleResponse {

    @JsonProperty("debt")
    private DebtInfo debt;

    @JsonProperty("schedule")
    private List<ScheduleItem> schedule;

    @JsonProperty("summary")
    private ScheduleSummary summary;

    /**
     * Basic debt information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DebtInfo {

        @JsonProperty("id")
        private Long id;

        @JsonProperty("creditor_name")
        private String creditorName;

        @JsonProperty("principal_amount")
        private BigDecimal principalAmount;
    }

    /**
     * Individual payment schedule item
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleItem {

        @JsonProperty("payment_number")
        private Integer paymentNumber;

        @JsonProperty("due_date")
        private LocalDate dueDate;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("principal")
        private BigDecimal principal;

        @JsonProperty("interest")
        private BigDecimal interest;

        @JsonProperty("remaining_after")
        private BigDecimal remainingAfter;

        @JsonProperty("status")
        private String status; // PAID, PENDING, OVERDUE
    }

    /**
     * Payment schedule summary
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleSummary {

        @JsonProperty("total_payments")
        private Integer totalPayments;

        @JsonProperty("completed_payments")
        private Integer completedPayments;

        @JsonProperty("total_to_pay")
        private BigDecimal totalToPay;

        @JsonProperty("total_principal")
        private BigDecimal totalPrincipal;

        @JsonProperty("total_interest")
        private BigDecimal totalInterest;
    }
}
