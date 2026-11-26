package com.finance.finance.common.filter;

import com.finance.finance.common.repository.IdempotencyKeyRepository;
import com.finance.finance.modules.user.entity.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter for idempotency keys to prevent DDoS
 * 
 * Limits:
 * - Per user: Max 100 idempotent requests per minute
 * - Per IP: Max 200 idempotent requests per minute
 * - Global: Max 1000 idempotent requests per minute
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IdempotencyRateLimitFilter extends OncePerRequestFilter {

    private final IdempotencyKeyRepository idempotencyKeyRepository;

    // Rate limit thresholds
    private static final int PER_USER_LIMIT = 100; // requests per minute
    private static final int PER_IP_LIMIT = 200;   // requests per minute
    private static final int GLOBAL_LIMIT = 1000;  // requests per minute

    // In-memory cache for rate limiting (can be replaced with Redis in production)
    private final ConcurrentHashMap<String, RateLimitBucket> ipBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, RateLimitBucket> userBuckets = new ConcurrentHashMap<>();
    private final RateLimitBucket globalBucket = new RateLimitBucket(GLOBAL_LIMIT);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Only apply rate limiting if Idempotency-Key header is present
        String idempotencyKey = request.getHeader("Idempotency-Key");
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Check global rate limit
            if (!globalBucket.tryConsume()) {
                log.warn("Global idempotency rate limit exceeded");
                sendRateLimitError(response, "Too many requests. Please try again later.");
                return;
            }

            // Check IP-based rate limit
            String clientIp = getClientIP(request);
            RateLimitBucket ipBucket = ipBuckets.computeIfAbsent(
                    clientIp, 
                    k -> new RateLimitBucket(PER_IP_LIMIT)
            );
            if (!ipBucket.tryConsume()) {
                log.warn("IP rate limit exceeded for: {}", clientIp);
                sendRateLimitError(response, "Too many requests from your IP. Please try again later.");
                return;
            }

            // Check user-based rate limit (if authenticated)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User) {
                User user = (User) auth.getPrincipal();
                UUID userId = user.getId();

                RateLimitBucket userBucket = userBuckets.computeIfAbsent(
                        userId,
                        k -> new RateLimitBucket(PER_USER_LIMIT)
                );
                if (!userBucket.tryConsume()) {
                    log.warn("User rate limit exceeded for: {}", userId);
                    sendRateLimitError(response, "Too many requests. Please slow down.");
                    return;
                }

                // Additional check: query database for suspicious activity
                LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
                long recentKeys = idempotencyKeyRepository.countByUserIdAndCreatedAtAfter(userId, oneMinuteAgo);
                
                if (recentKeys > PER_USER_LIMIT * 1.5) {
                    log.error("Suspicious activity detected for user {}: {} keys in last minute", userId, recentKeys);
                    sendRateLimitError(response, "Suspicious activity detected. Account temporarily restricted.");
                    return;
                }
            }

            // Cleanup expired buckets periodically
            if (Math.random() < 0.01) { // 1% chance per request
                cleanupExpiredBuckets();
            }

        } catch (Exception e) {
            log.error("Error in IdempotencyRateLimitFilter", e);
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Send 429 Too Many Requests error
     */
    private void sendRateLimitError(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429); // Too Many Requests
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        String jsonError = String.format(
                "{\"success\":false,\"error\":{\"code\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"%s\"}}",
                message
        );
        response.getWriter().write(jsonError);
    }

    /**
     * Get client IP address
     */
    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }
        
        return request.getRemoteAddr();
    }

    /**
     * Cleanup expired rate limit buckets
     */
    private void cleanupExpiredBuckets() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(2);
        
        ipBuckets.entrySet().removeIf(entry -> 
                entry.getValue().getLastRefill().isBefore(threshold)
        );
        
        userBuckets.entrySet().removeIf(entry -> 
                entry.getValue().getLastRefill().isBefore(threshold)
        );
        
        log.debug("Cleaned up expired rate limit buckets");
    }

    /**
     * Token bucket for rate limiting
     */
    private static class RateLimitBucket {
        private int tokens;
        private final int capacity;
        private LocalDateTime lastRefill;

        public RateLimitBucket(int capacity) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.lastRefill = LocalDateTime.now();
        }

        public synchronized boolean tryConsume() {
            refill();
            
            if (tokens > 0) {
                tokens--;
                return true;
            }
            return false;
        }

        private void refill() {
            LocalDateTime now = LocalDateTime.now();
            long minutesPassed = java.time.Duration.between(lastRefill, now).toMinutes();
            
            if (minutesPassed > 0) {
                tokens = capacity; // Full refill every minute
                lastRefill = now;
            }
        }

        public LocalDateTime getLastRefill() {
            return lastRefill;
        }
    }
}
