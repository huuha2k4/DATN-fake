package com.finance.finance.modules.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
    private String email;
    
    @Size(min = 3, max = 50, message = "Username phải từ 3-50 ký tự")
    @Pattern(
        regexp = "^[a-zA-Z0-9_]+$",
        message = "Username chỉ được chứa chữ cái, số và dấu gạch dưới"
    )
    private String username;
    
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 128, message = "Mật khẩu phải từ 8-128 ký tự")
    private String password;
    
    @NotBlank(message = "Tên đầy đủ không được để trống")
    @Size(min = 2, max = 100, message = "Tên phải từ 2-100 ký tự")
    private String fullName;
    
    @Pattern(
        regexp = "^\\+?[1-9]\\d{1,14}$",
        message = "Số điện thoại không hợp lệ (định dạng E.164)"
    )
    private String phone;
    
    @Size(max = 3, message = "Mã tiền tệ không được vượt quá 3 ký tự")
    private String preferredCurrency;
    
    @Size(max = 64, message = "Timezone không được vượt quá 64 ký tự")
    private String timezone;
    
    @Size(max = 10, message = "Language không được vượt quá 10 ký tự")
    private String language;
}
