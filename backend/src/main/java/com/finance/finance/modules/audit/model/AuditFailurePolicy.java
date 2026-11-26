package com.finance.finance.modules.audit.model;

public enum AuditFailurePolicy {
    /**
     * Mandatory financial audit: executes in caller's transaction; if audit fails, business transaction rolls back.
     */
    MANDATORY_FAIL_CLOSED,
    /**
     * Mandatory security/failure audit: executes in REQUIRES_NEW so it persists even when caller rolls back.
     */
    MANDATORY_REQUIRES_NEW,
    /**
     * Optional operational audit: fail-open with technical warning log and metrics increment.
     */
    OPTIONAL_FAIL_OPEN
}
