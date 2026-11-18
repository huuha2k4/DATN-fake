package com.finance.finance.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyEmailRequest {
    
    private String email;

    @NotBlank(message = "Mã xác thực không được để trống")
    private String token; // Hỗ trợ cả 6 số OTP hoặc token URL
}
