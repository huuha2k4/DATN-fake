package com.finance.finance.modules.transaction.exception;

import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class InsufficientBalanceException extends RuntimeException {
    private final BigDecimal currentBalance;
    private final BigDecimal requiredAmount;
    private final BigDecimal shortage;
    private final String currencyCode;
    
    public InsufficientBalanceException(BigDecimal currentBalance, BigDecimal requiredAmount, String currencyCode) {
        super(String.format("Insufficient balance. Current: %s %s, Required: %s %s", 
                currentBalance, currencyCode, requiredAmount, currencyCode));
        this.currentBalance = currentBalance;
        this.requiredAmount = requiredAmount;
        this.shortage = requiredAmount.subtract(currentBalance);
        this.currencyCode = currencyCode;
    }
}
