package com.finance.finance.modules.group.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String message) {
        super(message, "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}
