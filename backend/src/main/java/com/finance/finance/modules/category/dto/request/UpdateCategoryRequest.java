package com.finance.finance.modules.category.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCategoryRequest {
    
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;
    
    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be valid hex code")
    private String color;
    
    private Boolean isActive;
    
    private Short displayOrder;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
