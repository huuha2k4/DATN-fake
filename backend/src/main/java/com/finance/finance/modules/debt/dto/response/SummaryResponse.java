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
 * Response DTO for overall debts summary
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryResponse {

    @JsonProperty("borrowing")
    private DebtTypeSummary borrowing;

    @JsonProperty("lending")
    private DebtTypeSummary lending;

    @JsonProperty("net_position")
    private NetPosition netPosition;

    @JsonProperty("upcoming_payments")
    private List<UpcomingPayment> upcomingPayments;

    /**
     * Summary for a specific debt type (borrowing or lending)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DebtTypeSummary {

        @JsonProperty("total_count")
        private Integer totalCount;

        @JsonProperty("active_count")
        private Integer activeCount;

        @JsonProperty("total_principal")
        private BigDecimal totalPrincipal;

        @JsonProperty("total_paid")
        private BigDecimal totalPaid;

        @JsonProperty("total_remaining")
        private BigDecimal totalRemaining;

        @JsonProperty("monthly_payment")
        private BigDecimal monthlyPayment; // Only for borrowing

        @JsonProperty("total_interest_paid")
        private BigDecimal totalInterestPaid; // Only for borrowing
    }

    /**
     * Net financial position
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NetPosition {

        @JsonProperty("net_debt")
        private BigDecimal netDebt; // borrowing - lending

        @JsonProperty("debt_to_asset_ratio")
        private BigDecimal debtToAssetRatio; // Percentage
    }

    /**
     * Upcoming payment item
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingPayment {

        @JsonProperty("debt_id")
        private Long debtId;

        @JsonProperty("creditor_name")
        private String creditorName;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("due_date")
        private LocalDate dueDate;

        @JsonProperty("days_until")
        private Integer daysUntil;
    }
}
