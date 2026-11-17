package com.finance.finance.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.concurrent.TimeUnit;

/**
 * Annotation to mark endpoints as idempotent
 * Automatically handles duplicate request detection and response caching
 * 
 * Usage:
 * <pre>
 * &#64;Idempotent
 * &#64;PostMapping("/transactions")
 * public ResponseEntity&lt;TransactionResponse&gt; createTransaction(
 *     &#64;RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
 *     &#64;RequestBody CreateTransactionRequest request
 * ) {
 *     // Your logic here
 * }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    
    /**
     * TTL for idempotency key (default: 24 hours)
     */
    long ttl() default 24;
    
    /**
     * Time unit for TTL (default: HOURS)
     */
    TimeUnit unit() default TimeUnit.HOURS;
    
    /**
     * Resource type for tracking (e.g., "transaction", "debt", "goal")
     * Auto-detected from response if not specified
     */
    String resourceType() default "";
}
