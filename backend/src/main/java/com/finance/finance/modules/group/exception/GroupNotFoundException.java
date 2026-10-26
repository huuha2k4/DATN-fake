package com.finance.finance.modules.group.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.UUID;

public class GroupNotFoundException extends BusinessException {
    public GroupNotFoundException(UUID id) {
        super("Không tìm thấy nhóm với ID: " + id, "GROUP_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public GroupNotFoundException(String message) {
        super(message, "GROUP_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}
