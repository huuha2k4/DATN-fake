package com.finance.finance.modules.goal.dto.request;

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
public class CreateMilestoneRequest {
    
    @Size(max = 100, message = "Tên milestone tối đa 100 ký tự")
    private String name;
    
    @NotNull(message = "Phần trăm không được để trống")
    @Min(value = 1, message = "Phần trăm phải từ 1-100")
    @Max(value = 100, message = "Phần trăm phải từ 1-100")
    private Integer percentage;
    
    @NotNull(message = "Số tiền mục tiêu không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền mục tiêu phải > 0")
    private BigDecimal targetAmount;
    
    @Size(max = 500, message = "Phần thưởng tối đa 500 ký tự")
    private String reward;
}
