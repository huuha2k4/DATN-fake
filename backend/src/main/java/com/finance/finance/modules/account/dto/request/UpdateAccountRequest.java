package com.finance.finance.modules.account.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAccountRequest {
    
    @Size(min = 1, max = 100, message = "Tên tài khoản phải từ 1-100 ký tự")
    private String name;
    
    @Size(max = 10, message = "Icon tối đa 10 ký tự")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Mã màu phải theo định dạng hex (#RRGGBB)")
    private String color;
    
    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;
    
    private Boolean isIncludedInTotal;
    
    private Boolean isActive;
    
    private BigDecimal balance;
    
    // Credit card specific updates
    @DecimalMin(value = "0.0", message = "Hạn mức tín dụng phải >= 0")
    private BigDecimal creditLimit;
    
    @Min(value = 1, message = "Ngày chu kỳ thanh toán phải từ 1-31")
    @Max(value = 31, message = "Ngày chu kỳ thanh toán phải từ 1-31")
    private Integer billingCycleDay;
    
    @Min(value = 1, message = "Ngày đến hạn thanh toán phải từ 1-31")
    @Max(value = 31, message = "Ngày đến hạn thanh toán phải từ 1-31")
    private Integer paymentDueDay;
    
    private Integer version;
}
