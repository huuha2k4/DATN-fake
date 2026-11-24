package com.finance.finance.modules.analytics.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

/** Internal-only transport for AI 2-5. The browser never receives the service secret. */
@Component
@Slf4j
public class AiAnalyticsClient {
    private final RestClient client;
    private final String serviceSecret;

    public AiAnalyticsClient(@Value("${app.finai.service-url}") String serviceUrl,
                             @Value("${app.finai.service-secret}") String serviceSecret) {
        if (serviceSecret == null || serviceSecret.length() < 32) {
            throw new IllegalStateException("FINAI_SERVICE_SECRET must contain at least 32 characters");
        }
        this.serviceSecret = serviceSecret;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(35_000);
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
            }).header("X-FinAI-Service-Secret", serviceSecret).retrieve().body(Object.class);
            log.info("[AI_PROXY] path={}, network_total={}ms", path, elapsedMillis(started));
            return body;
        } catch (RestClientException error) {
            log.warn("[AI_PROXY] path={}, failed_after={}ms, error={}", path, elapsedMillis(started), error.getClass().getSimpleName());
            throw new ResponseStatusException(BAD_GATEWAY, "Dịch vụ phân tích tài chính đang tạm gián đoạn");
        }
    }

    public Object post(String path, UUID userId, Map<String, Object> request) {
        long started = System.nanoTime();
        request.put("user_id", userId.toString());
        try {
            Object body = client.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .header("X-FinAI-Service-Secret", serviceSecret).body(request)
                    .retrieve().body(Object.class);
            log.info("[AI_PROXY] path={}, network_total={}ms", path, elapsedMillis(started));
            return body;
        } catch (RestClientException error) {
            log.warn("[AI_PROXY] path={}, failed_after={}ms, error={}", path, elapsedMillis(started), error.getClass().getSimpleName());
            throw new ResponseStatusException(BAD_GATEWAY, "Dịch vụ phân tích tài chính đang tạm gián đoạn");
        }
    }

    private static long elapsedMillis(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
}

