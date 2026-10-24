package com.finance.finance.modules.auth.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends BusinessException {
    public InvalidCredentialsException(String message) {
        super(message, "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
    }
    
    public InvalidCredentialsException() {
        this("Email hoặc mật khẩu không đúng");
    }
}
