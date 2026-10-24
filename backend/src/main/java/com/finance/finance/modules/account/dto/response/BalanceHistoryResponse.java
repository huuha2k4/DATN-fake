package com.finance.finance.modules.account.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BalanceHistoryResponse {
    
    private AccountInfo account;
    private Period period;
    private List<BalancePoint> balanceHistory;
    private HistorySummary summary;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountInfo {
        private UUID id;
        private String name;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Period {
        private LocalDate from;
        private LocalDate to;
        private String interval; // day, week, month
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BalancePoint {
        private LocalDate date;
        private BigDecimal balance;
        private BigDecimal income;
        private BigDecimal expense;
        private BigDecimal netChange;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistorySummary {
        private BigDecimal startingBalance;
        private BigDecimal endingBalance;
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal netChange;
        private BigDecimal highestBalance;
        private BigDecimal lowestBalance;
    }
}
