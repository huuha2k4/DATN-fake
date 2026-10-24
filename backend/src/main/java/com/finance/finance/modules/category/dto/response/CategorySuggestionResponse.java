package com.finance.finance.modules.category.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategorySuggestionResponse {
    
    private List<SuggestionDto> suggestions;
    private RecommendedDto recommended;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuggestionDto {
        private UUID categoryId;
        private String categoryName;
        private BigDecimal confidence;
        private String reason;
        private SubcategoryDto subcategory;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubcategoryDto {
        private UUID id;
        private String name;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedDto {
        private UUID categoryId;
        private String categoryName;
        private BigDecimal confidence;
    }
}
