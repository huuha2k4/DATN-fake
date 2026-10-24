package com.finance.finance.modules.auth.repository;

import com.finance.finance.common.enums.TokenType;
import com.finance.finance.modules.auth.entity.AuthToken;
import com.finance.finance.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {
    
    Optional<AuthToken> findByToken(String token);
    
    Optional<AuthToken> findByTokenAndTokenType(String token, TokenType tokenType);
    
    @Query("SELECT at FROM AuthToken at WHERE at.token = :token AND at.tokenType = :tokenType AND at.used = false AND at.expiresAt > :now")
    Optional<AuthToken> findValidToken(@Param("token") String token, @Param("tokenType") TokenType tokenType, @Param("now") Instant now);
    
    @Modifying
    @Query("UPDATE AuthToken at SET at.used = true, at.usedAt = :now WHERE at.user.id = :userId AND at.tokenType = :tokenType AND at.used = false")
    void invalidateUserTokensByType(@Param("userId") UUID userId, @Param("tokenType") TokenType tokenType, @Param("now") Instant now);
    
    @Modifying
    @Query("DELETE FROM AuthToken at WHERE at.user.id = :userId AND at.tokenType = :tokenType")
    void deleteByUserIdAndTokenType(@Param("userId") UUID userId, @Param("tokenType") TokenType tokenType);
    
    @Modifying
    @Query("DELETE FROM AuthToken at WHERE at.expiresAt < :now OR at.used = true")
    void deleteExpiredOrUsedTokens(@Param("now") Instant now);
}
