package com.finance.finance.modules.merchant.exception;

public class MerchantNotFoundException extends RuntimeException {
    public MerchantNotFoundException(String message) {
        super(message);
    }
}
