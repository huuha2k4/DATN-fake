package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSpendRequestRequest {
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền phải > 0")
    private BigDecimal amount;

    @NotNull(message = "Category ID không được để trống")
    private UUID categoryId;

    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 300, message = "Mô tả không được quá 300 ký tự")
    private String description;

    private String notes;

    private String imageKey;
}
