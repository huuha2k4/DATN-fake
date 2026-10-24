package com.finance.finance.modules.merchant.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantResponse {
    
    private UUID id;
    private String name;
    private String logoUrl;
    private String category;
    private UUID defaultCategoryId;
    private String[] aliases;
    private String mcc;
    private Integer usageCount;
    private Boolean isSystem;
    private Boolean isCustom;
    
    private Integer transactionCount;
    private BigDecimal totalAmount;
    private LocalDate lastUsed;
    
    private List<LocationDto> locations;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationDto {
        private String address;
        private Double latitude;
        private Double longitude;
        private Integer distanceMeters; // For search results
    }
}
