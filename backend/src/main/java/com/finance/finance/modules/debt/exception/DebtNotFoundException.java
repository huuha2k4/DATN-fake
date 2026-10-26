package com.finance.finance.modules.debt.exception;

/**
 * Exception khi không tìm thấy debt
 */
public class DebtNotFoundException extends RuntimeException {
    
    public DebtNotFoundException(String message) {
        super(message);
    }
    
    public DebtNotFoundException(Long debtId) {
        super("Debt not found with id: " + debtId);
    }
}
