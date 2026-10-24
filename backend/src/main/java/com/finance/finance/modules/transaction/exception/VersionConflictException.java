package com.finance.finance.modules.transaction.exception;

import lombok.Getter;

@Getter
public class VersionConflictException extends RuntimeException {
    private final Long expectedVersion;
    private final Long currentVersion;
    
    public VersionConflictException(String message, Long expectedVersion, Long currentVersion) {
        super(message);
        this.expectedVersion = expectedVersion;
        this.currentVersion = currentVersion;
    }
}
