package com.finance.finance.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyEmailRequest {
    
    @NotBlank(message = "Token không được để trống")
    private String token;
}
