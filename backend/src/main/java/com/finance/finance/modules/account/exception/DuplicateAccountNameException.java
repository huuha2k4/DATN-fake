package com.finance.finance.modules.account.exception;

public class DuplicateAccountNameException extends RuntimeException {
    public DuplicateAccountNameException(String name) {
        super("Tài khoản với tên '" + name + "' đã tồn tại");
    }
}
