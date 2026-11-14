package com.finance.finance.modules.system.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class BankNotFoundException extends BusinessException {
    
    public BankNotFoundException(String message) {
        super(message, "BANK_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public static BankNotFoundException byId(java.util.UUID id) {
        return new BankNotFoundException("Bank not found with id: " + id);
    }
    
    public static BankNotFoundException byCode(String code) {
        return new BankNotFoundException("Bank not found with code: " + code);
    }
}
