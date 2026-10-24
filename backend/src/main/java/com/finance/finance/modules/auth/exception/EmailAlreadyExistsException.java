package com.finance.finance.modules.auth.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends BusinessException {
    public EmailAlreadyExistsException(String email) {
        super("Email đã tồn tại: " + email, "EMAIL_ALREADY_EXISTS", HttpStatus.CONFLICT);
    }
}
