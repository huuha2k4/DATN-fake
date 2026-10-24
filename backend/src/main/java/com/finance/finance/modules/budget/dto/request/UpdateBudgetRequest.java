package com.finance.finance.modules.budget.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBudgetRequest {
    
    @Size(min = 1, max = 100, message = "Tên ngân sách phải từ 1-100 ký tự")
    private String name;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Tổng số tiền phải > 0")
    private BigDecimal totalAmount;
    
    @Min(value = 0, message = "Ngưỡng cảnh báo phải từ 0-100")
    @Max(value = 100, message = "Ngưỡng cảnh báo phải từ 0-100")
    private Integer alertThresholdPercentage;
    
    private Boolean rolloverEnabled;
    
    @NotNull(message = "Version không được để trống (optimistic locking)")
    private Integer version;
}
