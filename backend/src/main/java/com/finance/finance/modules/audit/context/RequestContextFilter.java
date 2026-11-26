package com.finance.finance.modules.audit.context;

import com.finance.finance.modules.audit.model.AuditSource;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.net.InetAddress;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Establishes requestId, correlationId, sanitized IP/User-Agent, and normalized endpoint
 * for every incoming HTTP request and cleans up MDC/ThreadLocal in finally.
 */
@Component("auditRequestContextFilter")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestContextFilter extends OncePerRequestFilter {

    public static final String HEADER_REQUEST_ID = "X-Request-Id";
    public static final String HEADER_CORRELATION_ID = "X-Correlation-Id";

    private static final Pattern SAFE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    private static final Pattern UUID_SEGMENT = Pattern.compile(
            "/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=/|$)");
    private static final Pattern NUMERIC_SEGMENT = Pattern.compile("/\\d+(?=/|$)");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String requestId = sanitizeExternalId(request.getHeader(HEADER_REQUEST_ID));
        if (requestId == null) {
            requestId = UUID.randomUUID().toString();
        }
        String correlationId = sanitizeExternalId(request.getHeader(HEADER_CORRELATION_ID));
        if (correlationId == null) {
            correlationId = requestId;
        }

        String rawUri = request.getRequestURI();
        String endpoint = normalizeEndpoint(rawUri);
        AuditSource source = resolveSource(request, endpoint);
        String ipAddress = resolveClientIp(request);
        String userAgent = sanitizeUserAgent(request.getHeader("User-Agent"));

        AuditContext initial = AuditContext.builder()
                .requestId(requestId)
                .correlationId(correlationId)
                .source(source)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .httpMethod(sanitizeHttpMethod(request.getMethod()))
                .endpoint(endpoint)
                .build();

        AuditContextHolder.set(initial);
        response.setHeader(HEADER_REQUEST_ID, requestId);

        try {
            filterChain.doFilter(request, response);

            Object bestPattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            if (bestPattern instanceof String patternStr && !patternStr.isBlank()) {
                AuditContext current = AuditContextHolder.get();
                if (current != null) {
                    AuditContextHolder.set(current.toBuilder()
                            .endpoint(truncate(patternStr, 200))
                            .build());
                }
            }
        } finally {
            AuditContextHolder.clear();
        }
    }

    static String sanitizeExternalId(String candidate) {
        if (candidate == null) {
            return null;
        }
        String trimmed = candidate.trim();
        if (trimmed.isEmpty() || !SAFE_ID_PATTERN.matcher(trimmed).matches()) {
            return null;
        }
        return trimmed;
    }

    static String normalizeEndpoint(String uri) {
        if (uri == null || uri.isBlank()) {
            return "/";
        }
        int qIdx = uri.indexOf('?');
        String path = qIdx >= 0 ? uri.substring(0, qIdx) : uri;
        path = UUID_SEGMENT.matcher(path).replaceAll("/{id}");
        path = NUMERIC_SEGMENT.matcher(path).replaceAll("/{id}");
        return truncate(path, 200);
    }

    static AuditSource resolveSource(HttpServletRequest request, String endpoint) {
        if (endpoint != null) {
            if (endpoint.startsWith("/api/internal/v1/finai")) {
                return AuditSource.FINAI;
            }
            if (endpoint.startsWith("/api/internal/")) {
                return AuditSource.INTERNAL_SERVICE;
            }
            if (endpoint.startsWith("/api/v1/ocr")) {
                return AuditSource.OCR;
            }
            if (endpoint.startsWith("/api/v1/admin")) {
                return AuditSource.ADMIN_PORTAL;
            }
        }
        // Only treat client platform hint as advisory between WEB and MOBILE; never allow client to claim FINAI/SYSTEM_JOB.
        String platform = request.getHeader("X-Client-Platform");
        if (platform != null) {
            String normalized = platform.trim().toLowerCase();
            if ("mobile".equals(normalized) || "ios".equals(normalized) || "android".equals(normalized) || "expo".equals(normalized)) {
                return AuditSource.MOBILE;
            }
            if ("web".equals(normalized)) {
                return AuditSource.WEB;
            }
        }
        String ua = request.getHeader("User-Agent");
        if (ua != null) {
            String lowerUa = ua.toLowerCase();
            if (lowerUa.contains("expo") || lowerUa.contains("okhttp") || lowerUa.contains("cfnetwork") || lowerUa.contains("reactnative")) {
                return AuditSource.MOBILE;
            }
            if (lowerUa.contains("mozilla/") || lowerUa.contains("chrome/") || lowerUa.contains("safari/") || lowerUa.contains("firefox/")) {
                return AuditSource.WEB;
            }
        }
        return AuditSource.UNKNOWN;
    }

    static String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (isTrustedProxy(remoteAddr)) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                String firstHop = xff.split(",")[0].trim();
                String sanitized = sanitizeIp(firstHop);
                if (sanitized != null) {
                    return sanitized;
                }
            }
            String xRealIp = request.getHeader("X-Real-IP");
            String sanitizedReal = sanitizeIp(xRealIp);
            if (sanitizedReal != null) {
                return sanitizedReal;
            }
        }
        return sanitizeIp(remoteAddr);
    }

    private static boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return false;
        }
        try {
            InetAddress addr = InetAddress.getByName(remoteAddr.trim());
            return addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress();
        } catch (Exception ignored) {
            return false;
        }
    }

    private static String sanitizeIp(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.replaceAll("[\\r\\n\\t]", "").trim();
        if (cleaned.isEmpty() || cleaned.length() > 45) {
            return null;
        }
        return cleaned;
    }

    private static String sanitizeUserAgent(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.replaceAll("[\\r\\n\\t\\p{Cntrl}]", " ").trim();
        return truncate(cleaned, 255);
    }

    private static String sanitizeHttpMethod(String method) {
        if (method == null) {
            return null;
        }
        return truncate(method.replaceAll("[^A-Za-z]", "").toUpperCase(), 10);
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) {
            return null;
        }
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
