package com.finance.finance.modules.goal.dto.request;

import com.finance.finance.common.enums.AutoSaveFrequency;
import com.finance.finance.common.enums.GoalPriority;
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
public class UpdateGoalRequest {
    
    @Size(min = 1, max = 200, message = "Tên mục tiêu phải từ 1-200 ký tự")
    private String name;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền mục tiêu phải > 0")
    private BigDecimal targetAmount;
    
    private LocalDate targetDate;
    
    private GoalPriority priority;
    
    @Size(max = 10, message = "Icon tối đa 10 ký tự")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Mã màu phải theo định dạng hex (#RRGGBB)")
    private String color;
    
    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;
    
    private Boolean autoSaveEnabled;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền tự động lưu phải > 0")
    private BigDecimal autoSaveAmount;
    
    private AutoSaveFrequency autoSaveFrequency;
    
    private UUID accountId;
    
    @NotNull(message = "Version không được để trống (optimistic locking)")
    private Integer version;
}
