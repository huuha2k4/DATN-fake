package com.finance.finance.common.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.entity.IdempotencyKey;
import com.finance.finance.common.repository.IdempotencyKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Idempotency service for handling duplicate requests
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyKeyRepository repository;
    private final ObjectMapper objectMapper;

    // Default TTL: 24 hours
    private static final int DEFAULT_TTL_HOURS = 24;

    // Timeout for stuck processing: 5 minutes
    private static final int PROCESSING_TIMEOUT_MINUTES = 5;

    /**
     * Check if request with idempotency key already exists
     * 
     * @return Optional containing existing result if found, empty if new request
     */
    @Transactional
    public Optional<IdempotencyResult> check(
            String idempotencyKey,
            UUID userId,
            String endpoint,
            String httpMethod,
            String requestBody
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty(); // No idempotency key provided
        }

        Optional<IdempotencyKey> existing = repository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);

        if (existing.isEmpty()) {
            // New request - create record
            createProcessingRecord(idempotencyKey, userId, endpoint, httpMethod, requestBody);
            return Optional.empty();
        }

        IdempotencyKey record = existing.get();

        // Check if request body matches (prevent key reuse with different data)
        String requestHash = hashRequest(requestBody);
        if (record.getRequestHash() != null && !record.getRequestHash().equals(requestHash)) {
            log.warn("Idempotency key reused with different request body. Key: {}, User: {}", 
                    idempotencyKey, userId);
            throw new IdempotencyKeyMismatchException(
                    "Idempotency key already used for a different request"
            );
        }

        // Increment retry count
        record.incrementRetry();
        repository.save(record);

        switch (record.getStatus()) {
            case COMPLETED:
                // Return cached response
                log.info("Returning cached response for idempotency key: {}", idempotencyKey);
                return Optional.of(IdempotencyResult.cached(
                        record.getResponseBody(),
                        record.getResponseStatusCode(),
                        record.getResourceId(),
                        record.getResourceType()
                ));

            case FAILED:
                // Previous attempt failed - allow retry
                log.info("Previous attempt failed, allowing retry for key: {}", idempotencyKey);
                record.setStatus(IdempotencyKey.IdempotencyStatus.PROCESSING);
                repository.save(record);
                return Optional.empty();

            case PROCESSING:
                // Request already in progress
                log.warn("Request already in progress for key: {}", idempotencyKey);
                
                // Check if stuck (timeout)
                if (record.getCreatedAt().plusMinutes(PROCESSING_TIMEOUT_MINUTES).isBefore(LocalDateTime.now())) {
                    log.warn("Processing timeout, allowing retry. Key: {}", idempotencyKey);
                    return Optional.empty();
                }
                
                // Return conflict - client should retry later
                throw new IdempotencyConflictException(
                        "Request is currently being processed. Please retry after a few seconds."
                );

            default:
                return Optional.empty();
        }
    }

    /**
     * Save successful result
     */
    @Transactional
    public void saveResult(
            String idempotencyKey,
            UUID userId,
            Object response,
            int statusCode,
            UUID resourceId,
            String resourceType
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return; // No idempotency key provided
        }

        Optional<IdempotencyKey> existing = repository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);
        
        if (existing.isEmpty()) {
            log.warn("Idempotency key not found when saving result. Key: {}, User: {}", 
                    idempotencyKey, userId);
            return;
        }

        IdempotencyKey record = existing.get();
        
        try {
            String responseBody = objectMapper.writeValueAsString(response);
            record.markCompleted(responseBody, statusCode, resourceId, resourceType);
            repository.save(record);
            
            log.debug("Saved idempotency result. Key: {}, Resource: {}:{}", 
                    idempotencyKey, resourceType, resourceId);
        } catch (Exception e) {
            log.error("Failed to serialize response for idempotency key: {}", idempotencyKey, e);
            record.markFailed("Failed to serialize response: " + e.getMessage());
            repository.save(record);
        }
    }

    /**
     * Mark request as failed
     */
    @Transactional
    public void markFailed(String idempotencyKey, UUID userId, String errorMessage) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        repository.findByIdempotencyKeyAndUserId(idempotencyKey, userId)
                .ifPresent(record -> {
                    record.markFailed(errorMessage);
                    repository.save(record);
                });
    }

    /**
     * Cleanup expired records - runs every hour
     */
    @Scheduled(fixedDelay = 3600000) // 1 hour
    @Transactional
    public void cleanupExpired() {
        LocalDateTime now = LocalDateTime.now();
        
        int deletedCompleted = repository.deleteExpiredCompleted(now);
        int deletedFailed = repository.deleteExpiredFailed(now);
        
        if (deletedCompleted > 0 || deletedFailed > 0) {
            log.info("Cleaned up idempotency keys. Completed: {}, Failed: {}", 
                    deletedCompleted, deletedFailed);
        }
    }

    /**
     * Recover stuck processing records - runs every 10 minutes
     */
    @Scheduled(fixedDelay = 600000) // 10 minutes
    @Transactional
    public void recoverStuckProcessing() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(PROCESSING_TIMEOUT_MINUTES);
        var stuckRecords = repository.findStuckProcessing(threshold);
        
        if (!stuckRecords.isEmpty()) {
            log.warn("Found {} stuck processing records", stuckRecords.size());
            
            for (IdempotencyKey record : stuckRecords) {
                record.markFailed("Processing timeout - likely server crash or network failure");
                repository.save(record);
            }
        }
    }

    /**
     * Create processing record for new request
     */
    private void createProcessingRecord(
            String idempotencyKey,
            UUID userId,
            String endpoint,
            String httpMethod,
            String requestBody
    ) {
        IdempotencyKey record = IdempotencyKey.builder()
                .idempotencyKey(idempotencyKey)
                .userId(userId)
                .endpoint(endpoint)
                .httpMethod(httpMethod)
                .requestHash(hashRequest(requestBody))
                .status(IdempotencyKey.IdempotencyStatus.PROCESSING)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(DEFAULT_TTL_HOURS))
                .retryCount(0)
                .build();

        repository.save(record);
        log.debug("Created idempotency record. Key: {}, User: {}, Endpoint: {}", 
                idempotencyKey, userId, endpoint);
    }

    /**
     * Hash request body using SHA-256
     */
    private String hashRequest(String requestBody) {
        if (requestBody == null || requestBody.isBlank()) {
            return null;
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(requestBody.getBytes(StandardCharsets.UTF_8));
            
            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 algorithm not available", e);
            return null;
        }
    }

    /**
     * Result wrapper
     */
    public static class IdempotencyResult {
        private final String responseBody;
        private final Integer statusCode;
        private final UUID resourceId;
        private final String resourceType;

        private IdempotencyResult(String responseBody, Integer statusCode, 
                                 UUID resourceId, String resourceType) {
            this.responseBody = responseBody;
            this.statusCode = statusCode;
            this.resourceId = resourceId;
            this.resourceType = resourceType;
        }

        public static IdempotencyResult cached(String responseBody, Integer statusCode,
                                              UUID resourceId, String resourceType) {
            return new IdempotencyResult(responseBody, statusCode, resourceId, resourceType);
        }

        public String getResponseBody() { return responseBody; }
        public Integer getStatusCode() { return statusCode; }
        public UUID getResourceId() { return resourceId; }
        public String getResourceType() { return resourceType; }
    }

    /**
     * Exception for idempotency key mismatch
     */
    public static class IdempotencyKeyMismatchException extends RuntimeException {
        public IdempotencyKeyMismatchException(String message) {
            super(message);
        }
    }

    /**
     * Exception for concurrent processing conflict
     */
    public static class IdempotencyConflictException extends RuntimeException {
        public IdempotencyConflictException(String message) {
            super(message);
        }
    }
}
