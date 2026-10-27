package com.finance.finance.modules.debt.exception;

import java.util.UUID;

/**
 * Exception khi không tìm thấy debt
 */
public class DebtNotFoundException extends RuntimeException {
    
    public DebtNotFoundException(String message) {
        super(message);
    }
    
    public DebtNotFoundException(UUID debtId) {
        super("Debt not found with id: " + debtId);
    }
}
