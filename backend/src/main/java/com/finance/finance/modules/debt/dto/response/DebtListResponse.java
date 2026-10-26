package com.finance.finance.modules.debt.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO cho danh sách debts
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DebtListResponse {

    private List<DebtSummaryItem> debts;
    private Summary summary;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DebtSummaryItem {
        private Long id;

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

        private java.math.BigDecimal remaining;

        @JsonProperty("percentage_paid")
        private Integer percentagePaid;

        private com.finance.finance.common.enums.DebtStatus status;

        @JsonProperty("due_date")
        private LocalDate dueDate;

        @JsonProperty("next_payment_date")
        private LocalDate nextPaymentDate;

        @JsonProperty("next_payment_amount")
        private java.math.BigDecimal nextPaymentAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Summary {
        @JsonProperty("total_borrowing")
        private java.math.BigDecimal totalBorrowing;

        @JsonProperty("total_lending")
        private java.math.BigDecimal totalLending;

        @JsonProperty("net_debt")
        private java.math.BigDecimal netDebt;
    }
}
