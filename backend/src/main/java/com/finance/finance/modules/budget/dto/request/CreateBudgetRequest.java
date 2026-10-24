package com.finance.finance.modules.budget.dto.request;

import com.finance.finance.common.enums.BudgetPeriodType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBudgetRequest {
    
    @NotBlank(message = "Tên ngân sách không được để trống")
    @Size(min = 1, max = 100, message = "Tên ngân sách phải từ 1-100 ký tự")
    private String name;
    
    @NotNull(message = "Loại chu kỳ không được để trống")
    private BudgetPeriodType periodType;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;
    
    @NotNull(message = "Tổng số tiền không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Tổng số tiền phải > 0")
    private BigDecimal totalAmount;
    
    @NotBlank(message = "Mã tiền tệ không được để trống")
    @Size(min = 3, max = 3, message = "Mã tiền tệ phải là 3 ký tự (ISO 4217)")
    private String currencyCode;
    
    @Builder.Default
    private Boolean rolloverEnabled = false;
    
    @Min(value = 0, message = "Ngưỡng cảnh báo phải từ 0-100")
    @Max(value = 100, message = "Ngưỡng cảnh báo phải từ 0-100")
    @Builder.Default
    private Integer alertThresholdPercentage = 80;
    
    @Valid
    private List<BudgetItemRequest> items;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BudgetItemRequest {
        
        @NotNull(message = "Category ID không được để trống")
        private UUID categoryId;
        
        @NotNull(message = "Số tiền không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền phải > 0")
        private BigDecimal amount;
        
        @Min(value = 0, message = "Ngưỡng cảnh báo phải từ 0-100")
        @Max(value = 100, message = "Ngưỡng cảnh báo phải từ 0-100")
        @Builder.Default
        private Integer alertThresholdPercentage = 80;
    }
}
