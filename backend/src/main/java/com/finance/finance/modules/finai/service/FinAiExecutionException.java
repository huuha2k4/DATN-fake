package com.finance.finance.modules.finai.service;

/** Marks a business execution failure so the caller can persist FAILED after rollback. */
public class FinAiExecutionException extends RuntimeException {
    public FinAiExecutionException(String message, Throwable cause) { super(message, cause); }
}

