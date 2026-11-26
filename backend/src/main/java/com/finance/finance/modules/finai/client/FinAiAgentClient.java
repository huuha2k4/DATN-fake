package com.finance.finance.modules.finai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.context.AuditContext;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import com.finance.finance.modules.finai.dto.FinAiTemporalContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.net.SocketTimeoutException;
import java.util.*;

@Component
@Slf4j
public class FinAiAgentClient {
    private final RestClient client;
    private final String serviceSecret;
    private final ObjectMapper objectMapper;
    public FinAiAgentClient(@Value("${app.finai.service-url}") String serviceUrl,
                            @Value("${app.finai.service-secret}") String serviceSecret,
                            @Value("${app.finai.connect-timeout-ms:3000}") int connectTimeoutMs,
                            @Value("${app.finai.read-timeout-ms:70000}") int readTimeoutMs,
                            ObjectMapper objectMapper) {
        if (serviceSecret == null || serviceSecret.length() < 32) throw new IllegalStateException("FINAI_SERVICE_SECRET must contain at least 32 characters");
        this.serviceSecret = serviceSecret;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);
        this.client = RestClient.builder().baseUrl(serviceUrl).requestFactory(requestFactory).build();
    }
    public AgentResponse chat(UUID conversationId, String message, String contextToken,
                              List<HistoryItem> history, FinAiTemporalContext temporalContext) {
        long started = System.nanoTime();
        try {
            AgentResponse response = client.post().uri("/api/v1/agent/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-FinAI-Service-Secret", serviceSecret)
                    .header("X-Request-Id", currentRequestId())
                    .body(new AgentRequest(conversationId, message, contextToken, history, temporalContext))
                    .retrieve().body(AgentResponse.class);
            if (response == null || response.message == null)
                throw new BusinessException("FinAI trả về phản hồi không hợp lệ.", "AI_INTERNAL_ERROR", HttpStatus.BAD_GATEWAY);
            log.info("[FINAI_PIPELINE] stage=spring_to_python durationMs={} outcome=success", elapsedMillis(started));
            return response;
        } catch (HttpStatusCodeException e) {
            log.warn("[FINAI_PIPELINE] stage=spring_to_python durationMs={} outcome=http_error status={}", elapsedMillis(started), e.getStatusCode().value());
            throw mapUpstreamError(e);
        } catch (ResourceAccessException e) {
            log.warn("[FINAI_PIPELINE] stage=spring_to_python durationMs={} outcome=transport_error type={}", elapsedMillis(started), e.getClass().getSimpleName());
            if (hasTimeoutCause(e))
                throw new BusinessException("FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.", "AI_TIMEOUT", HttpStatus.GATEWAY_TIMEOUT);
            throw new BusinessException("Không thể kết nối đến dịch vụ FinAI lúc này. Vui lòng thử lại sau.", "AI_PROVIDER_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
        } catch (RestClientException e) {
            log.warn("[FINAI_PIPELINE] stage=spring_to_python durationMs={} outcome=invalid_response type={}", elapsedMillis(started), e.getClass().getSimpleName());
            throw new BusinessException("FinAI trả về phản hồi không hợp lệ.", "AI_INTERNAL_ERROR", HttpStatus.BAD_GATEWAY);
        }
    }
    private BusinessException mapUpstreamError(HttpStatusCodeException error) {
        int status = error.getStatusCode().value();
        String code = null;
        Integer retryAfter = null;
        try {
            JsonNode body = objectMapper.readTree(error.getResponseBodyAsString());
            code = text(body, "errorCode");
            if (code == null) code = text(body, "code");
            if (body.has("retryAfterSeconds") && body.get("retryAfterSeconds").canConvertToInt())
                retryAfter = body.get("retryAfterSeconds").asInt();
        } catch (Exception ignored) {
            // Never expose raw provider/internal payloads to callers.
        }
        if ("AI_RATE_LIMITED".equals(code) || (status == 429 && !"AI_QUOTA_EXCEEDED".equals(code)))
            return new BusinessException("FinAI đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.", "AI_RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, retryAfter);
        if ("AI_QUOTA_EXCEEDED".equals(code))
            return new BusinessException("Hạn mức AI hiện đã hết. Vui lòng thử lại sau khi hạn mức được khôi phục.", code, HttpStatus.TOO_MANY_REQUESTS);
        if ("AI_TIMEOUT".equals(code) || status == 504)
            return new BusinessException("FinAI chưa xử lý kịp yêu cầu. Vui lòng thử lại.", "AI_TIMEOUT", HttpStatus.GATEWAY_TIMEOUT);
        if ("INVALID_REQUEST".equals(code) || status == 400)
            return new BusinessException("Yêu cầu gửi đến FinAI không hợp lệ.", "INVALID_REQUEST", HttpStatus.BAD_REQUEST);
        if ("AI_PROVIDER_UNAVAILABLE".equals(code) || status == 503)
            return new BusinessException("Nhà cung cấp AI đang tạm gián đoạn. Vui lòng thử lại sau.", "AI_PROVIDER_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
        return new BusinessException("FinAI đang tạm gián đoạn. Vui lòng thử lại sau.", "AI_INTERNAL_ERROR", HttpStatus.BAD_GATEWAY);
    }
    private static String text(JsonNode body, String field) {
        JsonNode value = body == null ? null : body.get(field);
        return value != null && value.isTextual() ? value.asText() : null;
    }
    private static String currentRequestId() {
        AuditContext context = AuditContextHolder.get();
        return context == null || context.getRequestId() == null ? UUID.randomUUID().toString() : context.getRequestId();
    }
    private boolean hasTimeoutCause(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause())
            if (cause instanceof SocketTimeoutException) return true;
        return false;
    }
    private static long elapsedMillis(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
    public record AgentRequest(UUID conversationId, String message, String contextToken,
                               List<HistoryItem> history, FinAiTemporalContext temporalContext) {}
    public record HistoryItem(String role, String content) {}
    @Data @NoArgsConstructor
    public static class AgentResponse { private String message; private List<Proposal> proposals = List.of(); }
    @Data @NoArgsConstructor
    public static class Proposal { private String toolName; private Map<String, Object> arguments; private UUID planId; }
}
