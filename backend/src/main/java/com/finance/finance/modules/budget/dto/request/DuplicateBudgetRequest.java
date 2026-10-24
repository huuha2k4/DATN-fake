package com.finance.finance.modules.budget.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateBudgetRequest {
    
    @NotBlank(message = "Tên ngân sách mới không được để trống")
    @Size(min = 1, max = 100, message = "Tên ngân sách phải từ 1-100 ký tự")
    private String name;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;
    
    private AdjustAmounts adjustAmounts;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdjustAmounts {
        private Double percentage; // e.g., 5 for 5% increase
        private String reason;
    }
}
