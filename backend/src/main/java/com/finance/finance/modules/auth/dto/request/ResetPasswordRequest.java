package com.finance.finance.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    
    private String email;

    @NotBlank(message = "Mã xác thực không được để trống")
    private String token; // Hỗ trợ cả mã OTP 6 số hoặc token URL
    
    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, max = 128, message = "Mật khẩu phải từ 8-128 ký tự")
    private String newPassword;
}
