package com.finance.finance.modules.auth.repository;

import com.finance.finance.modules.auth.entity.RefreshToken;
import com.finance.finance.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    
    Optional<RefreshToken> findByToken(String token);
    
    List<RefreshToken> findByUserIdAndRevokedFalse(UUID userId);
    
    List<RefreshToken> findByUserIdAndDeviceIdAndRevokedFalse(UUID userId, String deviceId);
    
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :revokedAt WHERE rt.user.id = :userId AND rt.revoked = false")
    void revokeAllByUserId(@Param("userId") UUID userId, @Param("revokedAt") Instant revokedAt);
    
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :revokedAt WHERE rt.user.id = :userId AND rt.deviceId = :deviceId AND rt.revoked = false")
    void revokeAllByUserIdAndDeviceId(@Param("userId") UUID userId, @Param("deviceId") String deviceId, @Param("revokedAt") Instant revokedAt);
    
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") Instant now);
}
