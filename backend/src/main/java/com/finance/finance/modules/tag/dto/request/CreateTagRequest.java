package com.finance.finance.modules.tag.dto.request;

import jakarta.validation.constraints.NotBlank;
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
public class CreateTagRequest {
    
    @NotBlank(message = "Tag name is required")
    @Size(max = 50, message = "Tag name must not exceed 50 characters")
    private String name;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be valid hex code")
    private String color;
    
    @Size(max = 50, message = "Icon must not exceed 50 characters")
    private String icon;
}
