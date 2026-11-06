package com.finance.finance.modules.admin.dto.request;

import com.finance.finance.common.enums.CategoryKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSystemCategoryRequest {
    @NotBlank(message = "Tên danh mục không được để trống")
    private String name;

    private String code;

    @NotNull(message = "Loại danh mục (INCOME/EXPENSE) không được để trống")
    private CategoryKind kind;

    private String icon;
    private String color;
    private UUID parentId;
    private Integer displayOrder;
}

