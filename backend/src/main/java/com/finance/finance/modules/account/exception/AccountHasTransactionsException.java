package com.finance.finance.modules.account.exception;

import lombok.Getter;

@Getter
public class AccountHasTransactionsException extends RuntimeException {
    private final Long transactionCount;
    
    public AccountHasTransactionsException(Long transactionCount) {
        super("Không thể xóa tài khoản có " + transactionCount + " giao dịch");
        this.transactionCount = transactionCount;
    }
}
