package com.finance.finance.modules.category.dto.request;

import com.finance.finance.common.enums.CategoryKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCategoryRequest {
    
    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;
    
    @Size(max = 50, message = "Category code must not exceed 50 characters")
    private String code;
    
    @NotNull(message = "Category type is required")
    private CategoryKind type;

    public CategoryKind getKind() {
        return this.type;
    }
    
    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be valid hex code (e.g., #FF5733)")
    private String color;
    
    private UUID parentId;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
