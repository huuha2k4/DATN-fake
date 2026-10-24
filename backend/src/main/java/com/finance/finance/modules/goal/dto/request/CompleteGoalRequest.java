package com.finance.finance.modules.goal.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteGoalRequest {
    
    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String completedNote;
    
    @DecimalMin(value = "0.0", message = "Số tiền thực tế sử dụng phải >= 0")
    private BigDecimal actualAmountUsed;
}
