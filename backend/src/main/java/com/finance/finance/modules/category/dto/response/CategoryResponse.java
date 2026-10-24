package com.finance.finance.modules.category.dto.response;

import com.finance.finance.common.enums.CategoryKind;
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
public class CategoryResponse {
    
    private UUID id;
    private String code;
    private String name;
    private CategoryKind type;
    private CategoryKind kind;
    private String icon;
    private String color;
    private String description;
    
    private Boolean isSystem;
    private Boolean isCustom;
    private Boolean isActive;
    
    private UUID parentId;
    private String parentName;
    
    private Integer displayOrder;
    
    // Children categories
    private List<CategoryResponse> children;
    
    // Usage statistics
    private UsageStatisticsDto usageStatistics;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryChildDto {
        private UUID id;
        private String name;
        private String icon;
        private String color;
        private CategoryKind type;
        private Boolean isSystem;
        private Boolean isCustom;
        private UUID parentId;
        private Integer transactionCount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageStatisticsDto {
        private Integer transactionCount;
        private BigDecimal totalAmount;
        private LocalDate lastUsed;
    }
}
