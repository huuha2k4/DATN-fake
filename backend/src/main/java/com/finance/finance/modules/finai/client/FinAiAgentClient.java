package com.finance.finance.modules.finai.client;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.finai.dto.FinAiTemporalContext;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import java.net.SocketTimeoutException;
import java.util.*;

@Component
public class FinAiAgentClient {
    private final RestClient client;
    private final String serviceSecret;
    public FinAiAgentClient(@Value("${app.finai.service-url}") String serviceUrl,
                            @Value("${app.finai.service-secret}") String serviceSecret) {
        if (serviceSecret == null || serviceSecret.length() < 32) throw new IllegalStateException("FINAI_SERVICE_SECRET must contain at least 32 characters");
        this.serviceSecret = serviceSecret;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3_000);
        requestFactory.setReadTimeout(30_000);
        this.client = RestClient.builder().baseUrl(serviceUrl).requestFactory(requestFactory).build();
    }
    public AgentResponse chat(UUID conversationId, String message, String contextToken,
                              List<HistoryItem> history, FinAiTemporalContext temporalContext) {
        try {
            AgentResponse response = client.post().uri("/api/v1/agent/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-FinAI-Service-Secret", serviceSecret)
                    .body(new AgentRequest(conversationId, message, contextToken, history, temporalContext))
                    .retrieve().body(AgentResponse.class);
            if (response == null || response.message == null) throw new IllegalStateException("Empty AI response");
            return response;
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 429)
                throw new BusinessException("FinAI đang quá tải hạn mức. Bạn vui lòng thử lại sau ít phút.", "FINAI_QUOTA_EXCEEDED", HttpStatus.TOO_MANY_REQUESTS);
            if (e.getStatusCode().value() == 503)
                throw new BusinessException("Kết nối tới Gemini đang tạm gián đoạn. Bạn vui lòng thử lại sau.", "GEMINI_NETWORK_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
            if (e.getStatusCode().value() == 504)
                throw new BusinessException("FinAI chưa xử lý kịp yêu cầu. Bạn vui lòng thử lại.", "FINAI_MODEL_TIMEOUT", HttpStatus.GATEWAY_TIMEOUT);
            throw new BusinessException("FinAI đang tạm gián đoạn. Bạn vui lòng thử lại sau.", "FINAI_SERVICE_ERROR", HttpStatus.BAD_GATEWAY);
        } catch (RestClientException e) {
            if (hasTimeoutCause(e))
                throw new BusinessException("Kết nối FinAI đã hết thời gian chờ. Bạn vui lòng thử lại.", "FINAI_SERVICE_TIMEOUT", HttpStatus.GATEWAY_TIMEOUT);
            throw new BusinessException("Không thể kết nối FinAI lúc này. Bạn vui lòng thử lại sau.", "FINAI_SERVICE_UNAVAILABLE", HttpStatus.BAD_GATEWAY);
        }
    }
    private boolean hasTimeoutCause(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause())
            if (cause instanceof SocketTimeoutException) return true;
        return false;
    }
    public record AgentRequest(UUID conversationId, String message, String contextToken,
                               List<HistoryItem> history, FinAiTemporalContext temporalContext) {}
    public record HistoryItem(String role, String content) {}
    @Data @NoArgsConstructor
    public static class AgentResponse { private String message; private List<Proposal> proposals = List.of(); }
    @Data @NoArgsConstructor
    public static class Proposal { private String toolName; private Map<String, Object> arguments; private UUID planId; }
}
