package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawWalletRequest {
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền phải > 0")
    private BigDecimal amount;

    @Size(max = 300, message = "Mô tả không được quá 300 ký tự")
    private String description;

    private String reason; // overpayment, correction, other
}
