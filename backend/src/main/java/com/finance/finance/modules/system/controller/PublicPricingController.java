package com.finance.finance.modules.system.controller;

import com.finance.finance.modules.admin.service.SystemConfigService;
import com.finance.finance.modules.system.dto.response.PublicPricingConfigResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/public/pricing")
@RequiredArgsConstructor
public class PublicPricingController {

    private final SystemConfigService systemConfigService;

    @GetMapping
    public ResponseEntity<PublicPricingConfigResponse> getPricingConfig() {
        PublicPricingConfigResponse response = PublicPricingConfigResponse.builder()
                .freeTierMaxWallets(systemConfigService.getLong("FREE_TIER_MAX_WALLETS", 3))
                .freeTierOcrLimit(systemConfigService.getLong("FREE_TIER_OCR_LIMIT", 10))
                .premiumTierPriceMonthly(systemConfigService.getLong("PREMIUM_TIER_PRICE_MONTHLY", 49000))
                .enterpriseTierPriceMonthly(systemConfigService.getLong("ENTERPRISE_TIER_PRICE_MONTHLY", 199000))
                .build();
        return ResponseEntity.ok(response);
    }
}

