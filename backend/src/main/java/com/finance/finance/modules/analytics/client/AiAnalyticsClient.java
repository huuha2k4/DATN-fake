package com.finance.finance.modules.analytics.client;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.context.AuditContext;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.HttpStatusCodeException;

import java.net.SocketTimeoutException;
import java.util.Map;
import java.util.UUID;

/** Internal-only transport for AI 2-5. The browser never receives the service secret. */
@Component
@Slf4j
public class AiAnalyticsClient {
    private final RestClient client;
    private final String serviceSecret;

    public AiAnalyticsClient(@Value("${app.finai.service-url}") String serviceUrl,
                             @Value("${app.finai.service-secret}") String serviceSecret,
                             @Value("${app.analytics.connect-timeout-ms:3000}") int connectTimeoutMs,
                             @Value("${app.analytics.read-timeout-ms:35000}") int readTimeoutMs) {
        if (serviceSecret == null || serviceSecret.length() < 32) {
            throw new IllegalStateException("FINAI_SERVICE_SECRET must contain at least 32 characters");
        }
        this.serviceSecret = serviceSecret;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.client = RestClient.builder().baseUrl(serviceUrl).requestFactory(factory).build();
    }

    public Object get(String path, UUID userId, Map<String, ?> parameters) {
        long started = System.nanoTime();
        try {
            Object body = client.get().uri(builder -> {
                if (userId != null) {
                    builder.path(path).queryParam("user_id", userId);
                } else {
                    builder.path(path);
                }
                if (parameters != null) {
                    parameters.forEach(builder::queryParam);
                }
                return builder.build();
            }).header("X-FinAI-Service-Secret", serviceSecret)
                    .header("X-Request-Id", currentRequestId()).retrieve().body(Object.class);
            log.info("[AI_PROXY] path={}, network_total={}ms", path, elapsedMillis(started));
            return body;
        } catch (RestClientException error) {
            log.warn("[AI_PROXY] path={}, failed_after={}ms, error={}", path, elapsedMillis(started), error.getClass().getSimpleName());
            throw mapError(error);
        }
    }

    public Object post(String path, UUID userId, Map<String, Object> request) {
        long started = System.nanoTime();
        request.put("user_id", userId.toString());
        try {
            Object body = client.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .header("X-FinAI-Service-Secret", serviceSecret).body(request)
                    .header("X-Request-Id", currentRequestId())
                    .retrieve().body(Object.class);
            log.info("[AI_PROXY] path={}, network_total={}ms", path, elapsedMillis(started));
            return body;
        } catch (RestClientException error) {
            log.warn("[AI_PROXY] path={}, failed_after={}ms, error={}", path, elapsedMillis(started), error.getClass().getSimpleName());
            throw mapError(error);
        }
    }

    private BusinessException mapError(RestClientException error) {
        if (hasTimeoutCause(error))
            return new BusinessException("Phân tích AI chưa xử lý kịp yêu cầu.", "AI_TIMEOUT", HttpStatus.GATEWAY_TIMEOUT);
        if (error instanceof HttpStatusCodeException statusError) {
            int status = statusError.getStatusCode().value();
            if (status == 400)
                return new BusinessException("Yêu cầu phân tích không hợp lệ.", "INVALID_REQUEST", HttpStatus.BAD_REQUEST);
            if (status == 429)
                return new BusinessException("Dịch vụ phân tích AI đang giới hạn tần suất.", "AI_RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS);
        }
        return new BusinessException("Dịch vụ phân tích tài chính đang tạm gián đoạn.", "AI_PROVIDER_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
    }

    private static boolean hasTimeoutCause(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause())
            if (cause instanceof SocketTimeoutException) return true;
        return false;
    }

    private static String currentRequestId() {
        AuditContext context = AuditContextHolder.get();
        return context == null ? "analytics-internal" : context.getRequestId();
    }

    private static long elapsedMillis(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
}

