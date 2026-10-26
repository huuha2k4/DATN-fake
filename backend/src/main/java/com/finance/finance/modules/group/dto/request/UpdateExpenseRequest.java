package com.finance.finance.modules.group.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateExpenseRequest {
    @Size(max = 300, message = "Mô tả không được quá 300 ký tự")
    private String description;

    @DecimalMin(value = "0.01", message = "Số tiền phải > 0")
    private BigDecimal amount;

    private LocalDate expenseDate;

    private String notes;

    @Valid
    private List<CreateExpenseRequest.ExpenseSplitDto> splits;
}
