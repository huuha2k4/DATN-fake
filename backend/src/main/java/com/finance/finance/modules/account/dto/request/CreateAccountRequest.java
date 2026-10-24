package com.finance.finance.modules.account.dto.request;

import com.finance.finance.common.enums.AccountType;
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
public class CreateAccountRequest {
    
    @NotBlank(message = "Tên tài khoản không được để trống")
    @Size(min = 1, max = 100, message = "Tên tài khoản phải từ 1-100 ký tự")
    private String name;
    
    @NotNull(message = "Loại tài khoản không được để trống")
    private AccountType accountType;
    
    @NotBlank(message = "Mã tiền tệ không được để trống")
    @Size(min = 3, max = 3, message = "Mã tiền tệ phải là 3 ký tự (ISO 4217)")
    private String currencyCode;
    
    @NotNull(message = "Số dư ban đầu không được để trống")
    private BigDecimal initialBalance;
    
    // Bank/Institution related
    private String bankId;
    
    private String accountNumber;
    
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber; // For e-wallets
    
    @Pattern(regexp = "^[0-9]{4}$", message = "4 số cuối thẻ phải là 4 chữ số")
    private String cardNumberLast4; // For credit cards
    
    // Credit card specific
    @DecimalMin(value = "0.0", message = "Hạn mức tín dụng phải >= 0")
    private BigDecimal creditLimit;
    
    @Min(value = 1, message = "Ngày chu kỳ thanh toán phải từ 1-31")
    @Max(value = 31, message = "Ngày chu kỳ thanh toán phải từ 1-31")
    private Integer billingCycleDay;
    
    @Min(value = 1, message = "Ngày đến hạn thanh toán phải từ 1-31")
    @Max(value = 31, message = "Ngày đến hạn thanh toán phải từ 1-31")
    private Integer paymentDueDay;
    
    // Display settings
    @Size(max = 10, message = "Icon tối đa 10 ký tự")
    private String icon;
    
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Mã màu phải theo định dạng hex (#RRGGBB)")
    private String color;
    
    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;
    
    @Builder.Default
    private Boolean isIncludedInTotal = true;
}
