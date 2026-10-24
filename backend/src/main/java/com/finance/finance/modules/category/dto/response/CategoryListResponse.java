package com.finance.finance.modules.category.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryListResponse {
    
    private List<CategoryResponse> categories;
    private SummaryDto summary;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDto {
        private Integer totalCategories;
        private Integer systemCategories;
        private Integer customCategories;
        private Integer expenseCategories;
        private Integer incomeCategories;
    }
}
