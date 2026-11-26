package com.finance.finance.modules.finai.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.context.AuditContext;
import com.finance.finance.modules.audit.context.AuditContextHolder;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FinAiAgentClientTest {
    @Test
    void preservesRetryAfterAndRequestIdAndRedactsUpstreamMessage() throws IOException {
        var attempts = new AtomicInteger();
        var propagatedRequestId = new AtomicReference<String>();
        HttpServer upstream = newServer();
        upstream.createContext("/api/v1/agent/chat", exchange -> {
            attempts.incrementAndGet();
            propagatedRequestId.set(exchange.getRequestHeaders().getFirst("X-Request-Id"));
            exchange.getRequestBody().readAllBytes();
            byte[] body = """
                    {"errorCode":"AI_RATE_LIMITED","retryAfterSeconds":4,"message":"provider-internal.example"}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(429, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        upstream.start();
        AuditContextHolder.set(AuditContext.builder().requestId("transport-test").build());
        try {
            BusinessException error = callExpectingError(client(upstream));
            assertThat(error.getErrorCode()).isEqualTo("AI_RATE_LIMITED");
            assertThat(error.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
            assertThat(error.getRetryAfterSeconds()).isEqualTo(4);
            assertThat(error.getMessage()).doesNotContain("provider-internal");
            assertThat(attempts).hasValue(1);
            assertThat(propagatedRequestId).hasValue("transport-test");
        } finally {
            AuditContextHolder.clear();
            upstream.stop(0);
        }
    }

    @Test
    void stoppedPythonReportsAnHttpServiceError() throws IOException {
        HttpServer upstream = newServer();
        upstream.start();
        FinAiAgentClient agent = client(upstream);
        upstream.stop(0);
        BusinessException error = callExpectingError(agent);
        assertThat(error.getErrorCode()).isEqualTo("AI_PROVIDER_UNAVAILABLE");
        assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    private static HttpServer newServer() throws IOException {
        return HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 0), 0);
    }

    private static FinAiAgentClient client(HttpServer server) {
        return new FinAiAgentClient("http://127.0.0.1:" + server.getAddress().getPort(),
                "finai-test-secret-not-a-real-secret", 300, 2000, new ObjectMapper());
    }

    private static BusinessException callExpectingError(FinAiAgentClient client) {
        return assertThrows(BusinessException.class,
                () -> client.chat(UUID.randomUUID(), "test", "test-context", List.of(), null));
    }
}
