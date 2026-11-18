package com.finance.finance.common.repository;

import com.finance.finance.common.entity.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, UUID> {

    /**
     * Find idempotency key by key and user
     */
    Optional<IdempotencyKey> findByIdempotencyKeyAndUserId(String idempotencyKey, UUID userId);

    /**
     * Check if idempotency key exists for user
     */
    boolean existsByIdempotencyKeyAndUserId(String idempotencyKey, UUID userId);

    /**
     * Delete expired completed records (cleanup job)
     */
    @Modifying
    @Query("DELETE FROM IdempotencyKey i WHERE i.expiresAt < :now AND i.status = 'COMPLETED'")
    int deleteExpiredCompleted(@Param("now") LocalDateTime now);

    /**
     * Delete expired failed records (cleanup job)
     */
    @Modifying
    @Query("DELETE FROM IdempotencyKey i WHERE i.expiresAt < :now AND i.status = 'FAILED'")
    int deleteExpiredFailed(@Param("now") LocalDateTime now);

    /**
     * Find stuck processing records (for recovery)
     */
    @Query("SELECT i FROM IdempotencyKey i WHERE i.status = 'PROCESSING' AND i.createdAt < :threshold")
    java.util.List<IdempotencyKey> findStuckProcessing(@Param("threshold") LocalDateTime threshold);

    /**
     * Count retries for monitoring
     */
    @Query("SELECT COUNT(i) FROM IdempotencyKey i WHERE i.userId = :userId AND i.retryCount > 0")
    long countRetriesByUser(@Param("userId") UUID userId);
}
