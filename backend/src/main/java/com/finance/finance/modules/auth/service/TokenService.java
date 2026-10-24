package com.finance.finance.modules.auth.service;

import com.finance.finance.common.enums.TokenType;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.auth.entity.AuthToken;
import com.finance.finance.modules.auth.entity.RefreshToken;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.auth.exception.InvalidTokenException;
import com.finance.finance.modules.auth.exception.TokenExpiredException;
import com.finance.finance.modules.auth.repository.AuthTokenRepository;
import com.finance.finance.modules.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {
    
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthTokenRepository authTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final SecureRandom secureRandom = new SecureRandom();
    
    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;
    
    /**
     * Create a new refresh token
     */
    @Transactional
    public RefreshToken createRefreshToken(User user, String deviceId, String deviceName) {
        String token = generateSecureToken();
        
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(token)
                .deviceId(deviceId != null ? deviceId : "unknown")
                .deviceName(deviceName != null ? deviceName : "Unknown Device")
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
                .revoked(false)
                .build();
        
        refreshTokenRepository.save(refreshToken);
        log.debug("Created refresh token for user: {}, device: {}", user.getId(), deviceName);
        
        return refreshToken;
    }
    
    /**
     * Rotate refresh token (invalidate old one, create new one)
     * Implements refresh token rotation for security
     */
    @Transactional
    public RefreshToken rotateRefreshToken(String oldTokenValue) {
        // Find and validate old token
        RefreshToken oldToken = refreshTokenRepository.findByToken(oldTokenValue)
                .orElseThrow(() -> new InvalidTokenException("Refresh token không tồn tại"));
        
        // Check if token is revoked
        if (oldToken.isRevoked()) {
            // Token theft detection: this token was already used
            // Revoke all tokens in the chain
            revokeTokenChain(oldToken);
            throw new InvalidTokenException("Phát hiện token bị sử dụng lại. Tất cả phiên đăng nhập đã bị hủy.");
        }
        
        // Check if token is expired
        if (oldToken.isExpired()) {
            throw new TokenExpiredException("Refresh token đã hết hạn");
        }
        
        // Revoke old token
        oldToken.setRevoked(true);
        oldToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(oldToken);
        
        // Create new token
        String newTokenValue = generateSecureToken();
        
        RefreshToken newToken = RefreshToken.builder()
                .user(oldToken.getUser())
                .token(newTokenValue)
                .deviceId(oldToken.getDeviceId())
                .deviceName(oldToken.getDeviceName())
                .expiresAt(Instant.now().plusMillis(refreshTokenExpiration))
                .revoked(false)
                .replacedById(null)  // Will be set when this token is rotated
                .build();
        
        refreshTokenRepository.save(newToken);
        
        // Link old token to new token for theft detection
        oldToken.setReplacedById(newToken.getId());
        refreshTokenRepository.save(oldToken);
        
        log.debug("Rotated refresh token for user: {}", oldToken.getUser().getId());
        
        return newToken;
    }
    
    /**
     * Revoke all refresh tokens for a user
     */
    @Transactional
    public void revokeAllUserTokens(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
        log.info("Revoked all refresh tokens for user: {}", userId);
    }
    
    /**
     * Revoke all refresh tokens for a specific device
     */
    @Transactional
    public void revokeDeviceTokens(UUID userId, String deviceId) {
        refreshTokenRepository.revokeAllByUserIdAndDeviceId(userId, deviceId, Instant.now());
        log.info("Revoked refresh tokens for user: {}, device: {}", userId, deviceId);
    }
    
    /**
     * Revoke token chain when theft is detected
     */
    @Transactional
    protected void revokeTokenChain(RefreshToken stolenToken) {
        log.warn("Token theft detected for user: {}, revoking token chain", stolenToken.getUser().getId());
        
        // Revoke all tokens for this user's device
        refreshTokenRepository.revokeAllByUserIdAndDeviceId(
                stolenToken.getUser().getId(),
                stolenToken.getDeviceId(),
                Instant.now()
        );
    }
    
    /**
     * Generate a cryptographically secure random token
     */
    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
