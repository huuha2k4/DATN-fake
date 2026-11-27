package com.finance.finance.modules.admin.monitoring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.modules.audit.context.RequestContextFilter;
import com.finance.finance.modules.finai.tool.FinAiToolRegistry;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.admin.broadcast-worker-enabled=false")
@EnabledIfEnvironmentVariable(named = "DB_NAME", matches = "finora_phase1")
@Transactional
class AdminMonitoringIntegrationTest {
    @Autowired WebApplicationContext web;
    @Autowired RequestContextFilter requestContext;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired JwtTokenProvider jwt;
    @Autowired ObjectMapper mapper;
    @Autowired OperationMetricWriter writer;
    @jakarta.persistence.PersistenceContext jakarta.persistence.EntityManager entityManager;
    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final String ROOT = "/api/v1/admin/monitoring";
    private MockMvc mvc;
    private UUID admin;
    private String adminToken;

    @BeforeEach
    void setup() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("finora_phase1");
        mvc = MockMvcBuilders.webAppContextSetup(web).addFilters(requestContext).apply(springSecurity()).build();
        admin = jdbc.queryForObject("SELECT id FROM core.users WHERE system_role='ADMIN' AND deleted_at IS NULL", UUID.class);
        adminToken = bearer(admin);
    }

    @Test
    void ocrClassifiesCandidatesAndKeepsHistoryAndPrivateFieldsOutOfRequestTelemetry() throws Exception {
        var scan = new RequestObservation("OCR_SCAN", "synthetic-scan", admin);
        scan.key = "stable-local-key";
        scan.confidence = 0.0;
        scan.engine = "PADDLEOCR";
        scan.engineMs = 14L;
        scan.needsReview = true;
        scan.receiptSaved = true;
        writer.record(scan, 201, 14L);
        writer.record(scan, 201, 14L);
        var rejected = new RequestObservation("OCR_SCAN", "synthetic-rejected", admin);
        rejected.error = "INVALID_IMAGE";
        writer.record(rejected, 400, 14L);
        var failed = new RequestObservation("OCR_SCAN", "synthetic-unavailable", admin);
        failed.error = "OCR_SERVICE_UNAVAILABLE";
        writer.record(failed, 503, 14L);
        var saved = new RequestObservation("OCR_TRANSACTION", "synthetic-transaction", admin);
        writer.record(saved, 201, 14L);
        jdbc.update("INSERT INTO core.receipts(user_id,merchant_name,needs_review) VALUES (?, 'private-fixture', true)", admin);

        mvc.perform(scoped("/ocr/summary")).andExpect(status().isOk())
                .andExpect(jsonPath("$.aggregate.requests").value(3))
                .andExpect(jsonPath("$.aggregate.success_rate").value(50))
                .andExpect(jsonPath("$.aggregate.average_confidence").value(0))
                .andExpect(jsonPath("$.aggregate.retry_attempts").value(1))
                .andExpect(jsonPath("$.aggregate.engine_calls").value(2))
                .andExpect(jsonPath("$.aggregate.needs_review").value(1))
                .andExpect(jsonPath("$.aggregate.p95_ms").doesNotExist())
                .andExpect(jsonPath("$.firstObservedAt").isString())
                .andExpect(jsonPath("$.health.services.length()").value(8));
        var response = mvc.perform(scoped("/ocr/requests").param("search", "synthetic-scan").param("outcome", "SUCCESS"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.content[0].confidence").value(0))
                .andExpect(jsonPath("$.content[0].attempts").value(2)).andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("subject_hash", "dedup_key", "stable-local-key",
                "private-fixture", "image", "merchant", "amount", "signedUrl", admin.toString());
        var history = mvc.perform(get("/api/v1/admin/ocr/receipts").header("Authorization", adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").isString())
                .andExpect(jsonPath("$.content[0].confidence").doesNotExist()).andReturn().getResponse();
        assertThat(history.getContentAsString()).doesNotContain("private-fixture", "merchantName", "email", "userId");
        mvc.perform(get("/api/v1/admin/ocr/receipts").header("Authorization", adminToken).param("search", "private-fixture"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void aiStatisticsAndPermissionChecksUseRealPostgres() throws Exception {
        var sample = new RequestObservation("FINAI_ASSISTANT", "synthetic-clarification", admin);
        sample.responseType = "CLARIFICATION";
        sample.provider = mapper.readTree("""
                {"model":"gemini-fixture","calls":3,"rounds":2,"retries":1,"ms":210,"success":2,
                 "input":0,"errors":{"rate_limit":1,"private-payload":10},
                 "tools":{"get_accounts:read_ok":1,"get_accounts:read_ms":4,"create_goal:write_selected":1,
                          "private-tool:write_selected":1},"prompt":"private-prompt"}
                """);
        writer.record(sample, 200, 14L);
        sample = new RequestObservation("AI_ANOMALY", "synthetic-anomaly", admin);
        writer.record(sample, 200, 14L);
        LocalDate fixtureDay = today.minusDays(2);
        jdbc.update("""
                UPDATE ops.service_request_metrics SET started_at = started_at - interval '2 days'
                WHERE request_id IN ('synthetic-clarification','synthetic-anomaly')
                """);

        var response = mvc.perform(scoped("/ai/summary", fixtureDay)).andExpect(status().isOk())
                .andExpect(jsonPath("$.aggregate.requests").value(2)).andExpect(jsonPath("$.aggregate.failed").value(0))
                .andExpect(jsonPath("$.aggregate.input_tokens").value(0))
                .andExpect(jsonPath("$.aggregate.output_tokens").doesNotExist())
                .andExpect(jsonPath("$.providers[0].calls").value(3)).andExpect(jsonPath("$.providers[0].retries").value(1))
                .andExpect(jsonPath("$.providers[0].rounds").value(2))
                .andExpect(jsonPath("$.responses[0].response_type").value("CLARIFICATION"))
                .andExpect(jsonPath("$.actions.proposals").isNumber())
                .andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("private-payload", "private-prompt", "private-tool");
        mvc.perform(scoped("/ai/requests", fixtureDay).param("model","gemini-fixture").param("size","1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].tool_call_count").value(2));
        mvc.perform(scoped("/ai/requests").param("size","101")).andExpect(status().isBadRequest());
        mvc.perform(scoped("/ai/requests").param("sort","subject_hash")).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT + "/ai/summary").header("Authorization", adminToken)
                .param("from", today.minusDays(90).toString()).param("to", today.toString())).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT + "/dashboard")).andExpect(status().isUnauthorized());
        UUID ordinary = jdbc.queryForObject("""
                INSERT INTO core.users(email,full_name) VALUES ('phase3-monitor@example.test','Fixture') RETURNING id
                """, UUID.class);
        mvc.perform(get(ROOT + "/dashboard").header("Authorization", bearer(ordinary))).andExpect(status().isForbidden());
        String revoked = adminToken;
        jdbc.update("UPDATE core.users SET session_version = session_version + 1 WHERE id = ?", admin);
        entityManager.clear();
        mvc.perform(get(ROOT + "/dashboard").header("Authorization", revoked)).andExpect(status().isUnauthorized());
        var deniedWrite = mock(JdbcTemplate.class);
        when(deniedWrite.update(anyString(), any(Object[].class))).thenThrow(new IllegalStateException("synthetic"));
        new OperationMetricWriter(deniedWrite, mapper, new FinAiToolRegistry(), "synthetic-key", true)
                .record(sample, 200, 14L);
        verify(deniedWrite).update(anyString(), any(Object[].class));
    }

    @Test
    void actionRollupCountsCommittedActionsAndDeduplicatesLifecycleEvents() throws Exception {
        jdbc.update("""
                INSERT INTO core.finai_pending_actions
                  (user_id, tool_name, arguments_json, preview_json, status, idempotency_key,
                   created_at, expires_at, confirmed_at, executed_at)
                SELECT ?, 'create_goal', '{"private":"fixture-arguments"}', '{"private":"fixture-preview"}',
                       state, 'phase3-lifecycle-' || state, now() - interval '3 days', now() + interval '1 hour',
                       CASE WHEN state IN ('COMPLETED', 'FAILED') THEN now() - interval '3 days' END,
                       CASE WHEN state = 'COMPLETED' THEN now() - interval '3 days' + interval '20 milliseconds' END
                FROM unnest(ARRAY['PENDING','COMPLETED','CANCELLED','EXPIRED','FAILED']) AS states(state)
                """, admin);
        jdbc.update("""
                INSERT INTO core.finai_action_audit_logs (action_id, user_id, tool_name, event, status, detail, created_at)
                SELECT id, user_id, tool_name, status, status, 'fixture-detail', created_at
                FROM core.finai_pending_actions CROSS JOIN generate_series(1,2)
                WHERE idempotency_key LIKE 'phase3-lifecycle-%' AND status IN ('CANCELLED','EXPIRED','FAILED')
                """);
        var response = mvc.perform(scoped("/ai/summary", today.minusDays(3))).andExpect(status().isOk())
                .andExpect(jsonPath("$.actions.proposals").value(5))
                .andExpect(jsonPath("$.actions.confirmed").value(2))
                .andExpect(jsonPath("$.actions.committed").value(1))
                .andExpect(jsonPath("$.actions.cancelled").value(1))
                .andExpect(jsonPath("$.actions.expired").value(1))
                .andExpect(jsonPath("$.actions.failed").value(1))
                .andExpect(jsonPath("$.actionExecution[0].confirmation_to_commit_ms").value(20))
                .andReturn().getResponse();
        assertThat(response.getContentAsString()).doesNotContain("fixture-arguments", "fixture-preview", "fixture-detail");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void invalidImageThroughAuthenticatedEndpointIsObservedAfterResponse() throws Exception {
        String requestId = UUID.randomUUID().toString();
        try {
            mvc.perform(multipart("/api/v1/ocr/receipts").file(new MockMultipartFile(
                            "image", "fixture.jpg", "image/jpeg", new byte[]{1, 2, 3}))
                    .header("Authorization", adminToken).header("X-Request-Id", requestId))
                    .andExpect(status().isBadRequest());
            var outcomes = java.util.List.<String>of();
            for (int i = 0; i < 40 && outcomes.isEmpty(); i++) {
                outcomes = jdbc.queryForList("""
                        SELECT outcome || ':' || error_code FROM ops.service_request_metrics WHERE request_id = ?
                        """, String.class, requestId);
                if (outcomes.isEmpty()) Thread.sleep(50);
            }
            assertThat(outcomes).containsExactly("REJECTED:INVALID_IMAGE");
        } finally {
            jdbc.update("DELETE FROM ops.service_request_metrics WHERE request_id = ?", requestId);
        }
    }

    @Test
    void benchmarksPagedReadsAndRequestWrites() throws Exception {
        int previous = 0;
        for (int count : new int[]{100, 1000, 10000}) {
            jdbc.update("""
                    INSERT INTO ops.service_request_metrics
                      (request_id,operation,subject_hash,dedup_key,started_at,duration_ms,outcome,provider,model,
                       provider_calls,input_tokens,output_tokens,tool_calls,engine,engine_calls,engine_ms,confidence,receipt_saved)
                    SELECT 'phase3-bench-' || i, CASE WHEN i % 2 = 0 THEN 'FINAI_ASSISTANT' ELSE 'OCR_SCAN' END,
                           repeat('a',64), lpad(i::text,64,'0'), now() - interval '8 days',
                           20 + i % 800, CASE WHEN i % 10 = 0 THEN 'FAILED' ELSE 'SUCCESS' END,
                           CASE WHEN i % 2 = 0 THEN 'GEMINI' END, CASE WHEN i % 2 = 0 THEN 'gemini-fixture' END,
                           CASE WHEN i % 2 = 0 THEN 1 END, CASE WHEN i % 2 = 0 THEN 99 END,
                           CASE WHEN i % 2 = 0 THEN 75 END, CASE WHEN i % 2 = 0 THEN '{"get_accounts:read_ok":1}'::jsonb END,
                           CASE WHEN i % 2 = 1 THEN 'PADDLEOCR' END, i % 2, CASE WHEN i % 2 = 1 THEN i % 850 END,
                           CASE WHEN i % 2 = 1 THEN 0.55 END, CASE WHEN i % 2 = 1 THEN true END
                    FROM generate_series(?,?) i
                    """, previous + 1, count);
            previous = count;
            for (String path : new String[]{"/ai/summary", "/ai/requests", "/ocr/summary", "/ocr/requests"}) {
                var fixtureDay = today.minusDays(8);
                mvc.perform(scoped(path, fixtureDay)).andExpect(status().isOk());
                boolean trace = "true".equals(System.getenv("FINORA_PHASE3_SQL_TRACE"));
                if (trace) {
                    jdbc.execute("SET LOCAL log_statement='all'");
                    jdbc.queryForObject("SELECT ?::text", String.class, "PHASE3_BEGIN_" + count + path);
                }
                long started = System.nanoTime();
                var result = mvc.perform(scoped(path, fixtureDay)).andExpect(status().isOk()).andReturn().getResponse();
                System.out.printf("PHASE3_BENCH n=%d api=%s ms=%.2f bytes=%d%n",
                        count, path, elapsed(started), result.getContentAsByteArray().length);
                if (trace) {
                    jdbc.queryForObject("SELECT 'PHASE3_END'::text", String.class);
                    jdbc.execute("SET LOCAL log_statement='none'");
                }
            }
        }
        long started = System.nanoTime();
        for (int i = 0; i < 100; i++) {
            writer.record(new RequestObservation("OCR_SCAN", "synthetic-overhead-" + i, admin), 200, 14L);
        }
        System.out.printf("PHASE3_WRITE meanMs=%.3f%n", elapsed(started) / 100);
        System.out.printf("PHASE3_ROW avgBytes=%s%n", jdbc.queryForObject("""
                SELECT round(avg(pg_column_size(m)), 1) FROM ops.service_request_metrics m
                WHERE request_id LIKE 'phase3-bench-%'
                """, String.class));
        jdbc.queryForList("""
                EXPLAIN (ANALYZE, BUFFERS)
                SELECT id FROM ops.service_request_metrics WHERE started_at >= now() - interval '9 days'
                 AND started_at < now() - interval '7 days'
                 AND operation='FINAI_ASSISTANT' ORDER BY started_at DESC,id DESC LIMIT 15
                """, String.class).forEach(line -> System.out.println("PHASE3_PLAN " + line));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder scoped(String path) {
        return scoped(path, today);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder scoped(String path, LocalDate day) {
        return get(ROOT + path).param("from", day.toString()).param("to", day.toString())
                .header("Authorization", adminToken);
    }

    private String bearer(UUID id) {
        var user = users.findById(id).orElseThrow();
        return "Bearer " + jwt.generateAccessToken(user);
    }

    private static double elapsed(long started) {
        return (System.nanoTime() - started) / 1_000_000.0;
    }
}
