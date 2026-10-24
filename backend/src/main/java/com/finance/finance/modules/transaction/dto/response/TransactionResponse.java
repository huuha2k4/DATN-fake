package com.finance.finance.modules.transaction.dto.response;

import com.finance.finance.common.enums.CategoryStatus;
import com.finance.finance.common.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
    
    private UUID id;
    private TransactionType transactionType;
    
    // Account info
    private UUID accountId;
    private String accountName;
    private String accountIcon;
    
    // For transfer
    private UUID toAccountId;
    private String toAccountName;
    
    // Amount
    private BigDecimal amount;
    private String currencyCode;
    private String displayAmount;
    private BigDecimal baseAmount;
    private BigDecimal feeAmount;
    
    // For transfer
    private BigDecimal toAmount;
    private String toCurrencyCode;
    
    // Description
    private String description;
    
    // Date/Time
    private LocalDate transactionDate;
    private LocalTime transactionTime;
    private Instant occurredAt;
    
    // Category
    private CategoryDto category;
    
    // Merchant
    private MerchantDto merchant;
    
    // Tags
    private List<TagDto> tags;
    
    // Location
    private LocationDto location;
    
    // Note
    private String note;
    
    // Category AI
    private CategoryStatus categoryStatus;
    private BigDecimal confidenceScore;
    private AiSuggestionDto aiSuggestion;
    
    // Balance
    private BigDecimal balanceBefore;
    private BigDecimal balanceAfter;
    
    // Metadata
    private Boolean hasAttachments;
    private Boolean isRecurring;
    private UUID recurringTemplateId;
    private Boolean isExcludedFromReport;
    
    // Sync
    private Long syncSeq;
    
    // Audit
    private Instant createdAt;
    private Instant updatedAt;
    private Long version;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryDto {
        private UUID id;
        private String name;
        private String parentCategory;
        private String icon;
        private String color;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MerchantDto {
        private UUID id;
        private String name;
        private String logoUrl;
        private String category;
        private String location;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TagDto {
        private UUID id;
        private String name;
        private String color;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationDto {
        private Double latitude;
        private Double longitude;
        private String address;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiSuggestionDto {
        private String suggestedCategory;
        private String suggestedMerchant;
        private BigDecimal confidence;
        private String reasoning;
    }
}
