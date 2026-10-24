package com.finance.finance.modules.auth.exception;

import com.finance.finance.common.exception.BusinessException;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.Instant;

@Getter
public class AccountLockedException extends BusinessException {
    private final Instant lockedUntil;
    
    public AccountLockedException(String message, Instant lockedUntil) {
        super(message, "ACCOUNT_LOCKED", HttpStatus.FORBIDDEN);
        this.lockedUntil = lockedUntil;
    }
    
    public AccountLockedException() {
        this("Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần", null);
    }
    
    public AccountLockedException(String message) {
        this(message, null);
    }
}
