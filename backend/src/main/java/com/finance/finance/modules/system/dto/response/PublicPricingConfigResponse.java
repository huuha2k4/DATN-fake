package com.finance.finance.modules.system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicPricingConfigResponse {
    private long freeTierMaxWallets;
    private long freeTierOcrLimit;
    private long premiumTierPriceMonthly;
    private long enterpriseTierPriceMonthly;
}

