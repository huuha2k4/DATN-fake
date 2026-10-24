package com.finance.finance.modules.goal.dto.request;

import com.finance.finance.common.enums.AutoSaveFrequency;
import com.finance.finance.common.enums.GoalPriority;
import com.finance.finance.common.enums.GoalType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGoalRequest {
    
    @NotBlank(message = "Tên mục tiêu không được để trống")
    @Size(min = 1, max = 200, message = "Tên mục tiêu phải từ 1-200 ký tự")
    private String name;
    
    @NotNull(message = "Loại mục tiêu không được để trống")
    private GoalType goalType;
    
    @NotNull(message = "Số tiền mục tiêu không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền mục tiêu phải > 0")
    private BigDecimal targetAmount;
    
    @DecimalMin(value = "0.0", message = "Số tiền hiện tại phải >= 0")
    @Builder.Default
    private BigDecimal currentAmount = BigDecimal.ZERO;
    
    @NotBlank(message = "Mã tiền tệ không được để trống")
    @Size(min = 3, max = 3, message = "Mã tiền tệ phải là 3 ký tự")
    private String currencyCode;
    
    private LocalDate targetDate;
    
    @Builder.Default
    private GoalPriority priority = GoalPriority.MEDIUM;
    
    @Size(max = 10, message = "Icon tối đa 10 ký tự")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Mã màu phải theo định dạng hex (#RRGGBB)")
    private String color;
    
    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;
    
    // Auto save settings
    @Builder.Default
    private Boolean autoSaveEnabled = false;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền tự động lưu phải > 0")
    private BigDecimal autoSaveAmount;
    
    private AutoSaveFrequency autoSaveFrequency;
    
    private UUID accountId;
}
