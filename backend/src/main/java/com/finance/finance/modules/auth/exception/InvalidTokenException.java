package com.finance.finance.modules.auth.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class InvalidTokenException extends BusinessException {
    public InvalidTokenException() {
        super("Token không hợp lệ", "INVALID_TOKEN", HttpStatus.UNAUTHORIZED);
    }
    
    public InvalidTokenException(String message) {
        super(message, "INVALID_TOKEN", HttpStatus.UNAUTHORIZED);
    }
}
