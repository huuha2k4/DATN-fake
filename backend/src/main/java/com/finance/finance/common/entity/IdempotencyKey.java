package com.finance.finance.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Idempotency key entity for duplicate request prevention
 * Stores request/response to handle retries and network failures
 */
@Entity
@Table(name = "idempotency_keys", schema = "ops",
    uniqueConstraints = {
        @UniqueConstraint(name = "unique_idempotency_key_per_user", 
                         columnNames = {"idempotency_key", "user_id"})
    },
    indexes = {
        @Index(name = "idx_idempotency_key_lookup", 
               columnList = "idempotency_key, user_id"),
        @Index(name = "idx_idempotency_expires", 
               columnList = "expires_at"),
        @Index(name = "idx_idempotency_created_at", 
               columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdempotencyKey {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /**
     * Client-generated unique key from Idempotency-Key header
     */
    @Column(name = "idempotency_key", nullable = false, length = 255)
    private String idempotencyKey;

    /**
     * User who made the request (no FK for simplicity)
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * API endpoint path
     */
    @Column(name = "endpoint", nullable = false, length = 255)
    private String endpoint;

    /**
     * HTTP method (POST, PUT, DELETE, etc.)
     */
    @Column(name = "http_method", nullable = false, length = 10)
    private String httpMethod;

    /**
     * SHA256 hash of request body for validation
     */
    @Column(name = "request_hash", columnDefinition = "TEXT")
    private String requestHash;

    /**
     * Processing status: PROCESSING, COMPLETED, FAILED
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private IdempotencyStatus status = IdempotencyStatus.PROCESSING;

    /**
     * Cached JSON response to return for duplicate requests
     */
    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    /**
     * HTTP status code (200, 201, etc.)
     */
    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    /**
     * ID of created resource (for tracking/debugging)
     */
    @Column(name = "resource_id")
    private UUID resourceId;

    /**
     * Type of resource: transaction, debt, goal, group, etc.
     */
    @Column(name = "resource_type", length = 50)
    private String resourceType;

    /**
     * Error message if status = FAILED
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Count of duplicate attempts
     */
    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    /**
     * When the request was first received
     */
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * When the request was completed
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * Last retry timestamp
     */
    @Column(name = "last_retry_at")
    private LocalDateTime lastRetryAt;

    /**
     * TTL expiration time (cleanup after 24-48 hours)
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Status enum
     */
    public enum IdempotencyStatus {
        PROCESSING,  // Request is being processed
        COMPLETED,   // Request completed successfully
        FAILED       // Request failed
    }

    /**
     * Mark as completed with response
     */
    public void markCompleted(String responseBody, int statusCode, UUID resourceId, String resourceType) {
        this.status = IdempotencyStatus.COMPLETED;
        this.responseBody = responseBody;
        this.responseStatusCode = statusCode;
        this.resourceId = resourceId;
        this.resourceType = resourceType;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Mark as failed with error
     */
    public void markFailed(String errorMessage) {
        this.status = IdempotencyStatus.FAILED;
        this.errorMessage = errorMessage;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * Increment retry count
     */
    public void incrementRetry() {
        this.retryCount++;
        this.lastRetryAt = LocalDateTime.now();
    }
}
