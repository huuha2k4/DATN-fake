package com.finance.finance.modules.budget.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetItemRequest {
    
    @NotNull(message = "Category ID không được để trống")
    private UUID categoryId;
    
    @Size(max = 100, message = "Tên ngân sách không vượt quá 100 ký tự")
    private String name;
    
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải > 0")
    private BigDecimal amount;
    
    @Min(value = 0, message = "Ngưỡng cảnh báo phải từ 0-100")
    @Max(value = 100, message = "Ngưỡng cảnh báo phải từ 0-100")
    @Builder.Default
    private Integer alertThresholdPercentage = 80;
}
