package com.finance.finance.modules.user.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.UUID;

public class UserNotFoundException extends BusinessException {
    public UserNotFoundException(String email) {
        super("Không tìm thấy người dùng với email: " + email, "USER_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public UserNotFoundException(UUID id) {
        super("Không tìm thấy người dùng với ID: " + id, "USER_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}
