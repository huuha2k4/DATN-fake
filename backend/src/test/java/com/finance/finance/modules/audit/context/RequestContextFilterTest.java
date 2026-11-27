package com.finance.finance.modules.audit.context;

import com.finance.finance.modules.audit.model.AuditSource;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class RequestContextFilterTest {

    private final RequestContextFilter filter = new RequestContextFilter();

    @AfterEach
    void cleanup() {
        AuditContextHolder.clear();
    }

    @Test
    void generatesSafeIdsNormalizesEndpointStripsQueryAndClearsMdc() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/accounts/550e8400-e29b-41d4-a716-446655440000/summary");
        request.setQueryString("token=secret-jwt");
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.1");
        request.addHeader("X-Request-Id", "invalid\r\nid!");

        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<AuditContext> captured = new AtomicReference<>();

        FilterChain chain = (req, res) -> captured.set(AuditContextHolder.get());
        filter.doFilter(request, response, chain);

        AuditContext ctx = captured.get();
        assertThat(ctx).isNotNull();
        assertThat(ctx.getRequestId()).isNotEqualTo("invalid\r\nid!");
        assertThat(ctx.getEndpoint()).isEqualTo("/api/v1/accounts/{id}/summary");
        assertThat(ctx.getEndpoint()).doesNotContain("token=secret-jwt");
        assertThat(ctx.getIpAddress()).isEqualTo("127.0.0.1");
        assertThat(response.getHeader(RequestContextFilter.HEADER_REQUEST_ID)).isEqualTo(ctx.getRequestId());

        // MDC and ThreadLocal must be cleaned in finally
        assertThat(AuditContextHolder.get()).isNull();
        assertThat(MDC.get(AuditContextHolder.MDC_REQUEST_ID)).isNull();
    }

    @Test
    void ignoresXForwardedForFromUntrustedPublicRemoteAddr() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setRemoteAddr("198.51.100.42");
        request.addHeader("X-Forwarded-For", "127.0.0.1");
        request.addHeader("X-Client-Platform", "FINAI"); // Client cannot spoof FINAI source

        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<AuditContext> captured = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) -> captured.set(AuditContextHolder.get()));

        assertThat(captured.get().getIpAddress()).isEqualTo("198.51.100.42");
        assertThat(captured.get().getSource()).isNotEqualTo(AuditSource.FINAI);
    }
}
