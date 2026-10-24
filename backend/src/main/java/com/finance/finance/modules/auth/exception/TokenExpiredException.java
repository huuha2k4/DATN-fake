package com.finance.finance.modules.auth.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class TokenExpiredException extends BusinessException {
    public TokenExpiredException() {
        super("Token đã hết hạn", "TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED);
    }
    
    public TokenExpiredException(String message) {
        super(message, "TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED);
    }
}
