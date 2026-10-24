package com.finance.finance.modules.goal.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class ContributeRequest {
    
    @NotNull(message = "Số tiền đóng góp không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền đóng góp phải > 0")
    private BigDecimal amount;
    
    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String note;
    
    private UUID sourceAccountId;
}
