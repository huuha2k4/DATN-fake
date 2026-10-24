package com.finance.finance.modules.account.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AccountListResponse {
    
    private List<AccountResponse> accounts;
    private AccountSummary summary;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AccountSummary {
        private BigDecimal totalAssets;
        private BigDecimal totalLiabilities;
        private BigDecimal netWorth;
        private String currencyCode;
    }
}
