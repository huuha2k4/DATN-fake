package com.finance.finance.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    
    @NotBlank(message = "Email hoặc username không được để trống")
    private String login; // Can be email or username
    
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
    
    private String deviceId;
    private String deviceName;
    private Boolean rememberMe = false;
}
