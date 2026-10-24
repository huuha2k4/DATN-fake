package com.finance.finance.modules.account.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdjustBalanceRequest {
    
    @NotNull(message = "Số dư mới không được để trống")
    private BigDecimal newBalance;
    
    @NotBlank(message = "Lý do điều chỉnh không được để trống")
    @Size(min = 1, max = 500, message = "Lý do điều chỉnh phải từ 1-500 ký tự")
    private String reason;
    
    private LocalDate adjustmentDate;
}
