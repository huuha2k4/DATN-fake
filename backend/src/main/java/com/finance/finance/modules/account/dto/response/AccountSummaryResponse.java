package com.finance.finance.modules.account.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AccountSummaryResponse {
    
    private Summary summary;
    private List<ByType> byType;
    private List<ByCurrency> byCurrency;
    private List<NetWorthTrend> netWorthTrend30Days;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private BigDecimal totalAssets;
        private BigDecimal totalLiabilities;
        private BigDecimal netWorth;
        private String currencyCode;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByType {
        private AccountType accountType;
        private Integer count;
        private BigDecimal totalBalance;
        private Double percentage;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByCurrency {
        private String currencyCode;
        private BigDecimal totalBalance;
        private BigDecimal totalBalanceInBase;
        private Integer accountCount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NetWorthTrend {
        private LocalDate date;
        private BigDecimal netWorth;
    }
}
