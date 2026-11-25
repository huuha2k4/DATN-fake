package com.finance.finance.common.security;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.modules.user.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtTokenProviderTest {

    private static final String SECRET = "finora-test-jwt-secret-key-at-least-32-bytes-long";
    private static final String ISSUER = "finance-app";

    private JwtTokenProvider provider;
    private SecretKey secretKey;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(provider, "accessTokenExpiration", 3_600_000L);
        ReflectionTestUtils.setField(provider, "refreshTokenExpiration", 86_400_000L);
        ReflectionTestUtils.setField(provider, "issuer", ISSUER);
        provider.init();
        secretKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void validTokenAcceptedAndClaimsExtracted() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("tester@finora.local")
                .systemRole(SystemRole.USER)
                .subscriptionTier(SubscriptionTier.FREE)
                .build();

        String token = provider.generateAccessToken(user);

        assertTrue(provider.validateToken(token));
        assertEquals(userId, provider.getUserIdFromToken(token));
        assertEquals("tester@finora.local", provider.getEmailFromToken(token));
    }

    @Test
    void wrongIssuerRejected() {
        String foreignToken = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer("malicious-issuer")
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(secretKey)
                .compact();

        assertFalse(provider.validateToken(foreignToken));
    }

    @Test
    void expiredTokenRejected() {
        String expiredToken = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .issuedAt(Date.from(Instant.now().minusSeconds(7200)))
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(secretKey)
                .compact();

        assertFalse(provider.validateToken(expiredToken));
    }

    @Test
    void tamperedSignatureRejected() {
        SecretKey otherKey = Keys.hmacShaKeyFor("another-secret-key-at-least-32-bytes-long-123".getBytes(StandardCharsets.UTF_8));
        String tamperedToken = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(otherKey)
                .compact();

        assertFalse(provider.validateToken(tamperedToken));
    }
}
