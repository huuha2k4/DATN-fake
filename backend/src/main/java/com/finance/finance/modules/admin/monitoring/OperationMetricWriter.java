package com.finance.finance.modules.admin.monitoring;

import jakarta.annotation.PreDestroy;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.modules.finai.tool.FinAiToolDefinition;
import com.finance.finance.modules.finai.tool.FinAiToolMode;
import com.finance.finance.modules.finai.tool.FinAiToolRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Slf4j
@Component
public class OperationMetricWriter {
    private static final Set<String> PROVIDER_ERRORS = Set.of(
            "quota","rate_limit","timeout","provider_unavailable","network","invalid_request","other");
    private static final Set<String> READ_COUNTERS = Set.of("read_ok","read_error","read_ms");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final Map<String, FinAiToolMode> toolModes;
    private final byte[] hmacKey;
    private final boolean enabled;
    private final AtomicLong warnedAt = new AtomicLong();
    private final ThreadPoolExecutor writes = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(256), Thread.ofPlatform().daemon().name("service-metrics").factory());

    public OperationMetricWriter(JdbcTemplate jdbc, ObjectMapper mapper, FinAiToolRegistry registry,
                                 @Value("${app.audit.hmac-secret}") String hmacKey,
                                 @Value("${app.monitoring.telemetry-enabled:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.toolModes = registry.all().stream().collect(Collectors.toUnmodifiableMap(
                FinAiToolDefinition::name, FinAiToolDefinition::mode));
        this.hmacKey = hmacKey.getBytes(StandardCharsets.UTF_8);
        this.enabled = enabled;
    }

    void submit(RequestObservation sample, int status) {
        if (!enabled) return;
        long duration = RequestObservation.elapsed(sample.start);
        try {
            writes.execute(() -> record(sample, status, duration));
        } catch (RejectedExecutionException busy) {
            warn(sample.operation, "QUEUE_FULL");
        }
    }

    @PreDestroy
    void shutdown() {
        writes.shutdownNow();
    }

    void record(RequestObservation sample, int status, long duration) {
        try {
            String error = sample.error;
            String outcome = switch (status) {
                case 400, 404, 409, 413, 415, 422 -> "REJECTED";
                default -> status >= 400 ? "FAILED" : "SUCCESS";
            };
            if (Set.of("OCR_REJECTED_IMAGE", "INVALID_IMAGE", "FILE_TOO_LARGE").contains(error == null ? "" : error)) {
                outcome = "REJECTED";
            }
            if (error == null && outcome.equals("REJECTED")) error = status == 413 ? "FILE_TOO_LARGE" : "INVALID_REQUEST";
            if (error == null && outcome.equals("FAILED")) error = "INTERNAL_ERROR";
            var metadata = sample.provider;
            String model = metadata == null ? null : metadata.path("model").asText(null);
            if (model != null && !model.matches("[A-Za-z0-9._/-]{1,80}")) model = null;
            var provider = value(metadata,"calls") != null && value(metadata,"calls") > 0 ? "GEMINI" : null;
            if (provider == null) model = null;
            jdbc.update("""
                    INSERT INTO ops.service_request_metrics AS prior
                      (request_id,operation,subject_hash,dedup_key,started_at,duration_ms,outcome,error_code,
                       response_type,provider,model,input_tokens,output_tokens,model_rounds,provider_calls,
                       provider_retries,provider_ms,provider_errors,provider_last_success,tool_calls,
                       engine,engine_calls,engine_ms,confidence,needs_review,receipt_saved)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS jsonb),?,CAST(? AS jsonb),?,?,?,?,?,?)
                    ON CONFLICT (dedup_key) DO UPDATE SET
                      attempts = prior.attempts + 1, request_id = excluded.request_id,
                      duration_ms = excluded.duration_ms, outcome = excluded.outcome, error_code = excluded.error_code,
                      response_type = excluded.response_type,
                      provider = coalesce(excluded.provider, prior.provider), model = coalesce(excluded.model, prior.model),
                      input_tokens = CASE WHEN prior.input_tokens IS NOT NULL OR excluded.input_tokens IS NOT NULL
                        THEN coalesce(prior.input_tokens,0) + coalesce(excluded.input_tokens,0) END,
                      output_tokens = CASE WHEN prior.output_tokens IS NOT NULL OR excluded.output_tokens IS NOT NULL
                        THEN coalesce(prior.output_tokens,0) + coalesce(excluded.output_tokens,0) END,
                      model_rounds = CASE WHEN prior.model_rounds IS NOT NULL OR excluded.model_rounds IS NOT NULL
                        THEN coalesce(prior.model_rounds,0) + coalesce(excluded.model_rounds,0) END,
                      provider_calls = CASE WHEN prior.provider_calls IS NOT NULL OR excluded.provider_calls IS NOT NULL
                        THEN coalesce(prior.provider_calls,0) + coalesce(excluded.provider_calls,0) END,
                      provider_retries = CASE WHEN prior.provider_retries IS NOT NULL OR excluded.provider_retries IS NOT NULL
                        THEN coalesce(prior.provider_retries,0) + coalesce(excluded.provider_retries,0) END,
                      provider_ms = CASE WHEN prior.provider_ms IS NOT NULL OR excluded.provider_ms IS NOT NULL
                        THEN coalesce(prior.provider_ms,0) + coalesce(excluded.provider_ms,0) END,
                      provider_errors = (
                        SELECT jsonb_object_agg(key,total) FROM (
                          SELECT key,sum(value::bigint) total FROM (
                            SELECT * FROM jsonb_each_text(prior.provider_errors)
                            UNION ALL SELECT * FROM jsonb_each_text(excluded.provider_errors)
                          ) counters GROUP BY key
                        ) grouped
                      ),
                      provider_last_success = greatest(prior.provider_last_success, excluded.provider_last_success),
                      tool_calls = (
                        SELECT jsonb_object_agg(key,total) FROM (
                          SELECT key,sum(value::bigint) total FROM (
                            SELECT * FROM jsonb_each_text(prior.tool_calls)
                            UNION ALL SELECT * FROM jsonb_each_text(excluded.tool_calls)
                          ) counters GROUP BY key
                        ) grouped
                      ),
                      engine = coalesce(excluded.engine,prior.engine),
                      engine_calls = prior.engine_calls + excluded.engine_calls,
                      engine_ms = CASE WHEN prior.engine_ms IS NOT NULL OR excluded.engine_ms IS NOT NULL
                        THEN coalesce(prior.engine_ms,0) + coalesce(excluded.engine_ms,0) END,
                      confidence = excluded.confidence, needs_review = excluded.needs_review,
                      receipt_saved = excluded.receipt_saved
                    """, sample.requestId, sample.operation, digest("subject:" + sample.actor),
                    sample.key == null ? null : digest(sample.operation + ":" + sample.actor + ":" + sample.key),
                    sample.startedAt.atOffset(ZoneOffset.UTC), duration, outcome, error,
                    sample.responseType, provider, model, value(metadata,"input"), value(metadata,"output"),
                    value(metadata,"rounds"), value(metadata,"calls"), value(metadata,"retries"), value(metadata,"ms"),
                    counters(metadata, "errors"), value(metadata,"success") != null && value(metadata,"success") > 0
                            ? sample.startedAt.plusMillis(duration).atOffset(ZoneOffset.UTC) : null,
                    counters(metadata, "tools"), sample.engine, sample.engineMs == null ? 0 : 1,
                    sample.engineMs, sample.confidence,
                    outcome.equals("SUCCESS") ? sample.needsReview : null,
                    outcome.equals("SUCCESS") ? sample.receiptSaved : null);
        } catch (Exception error) {
            warn(sample.operation, error.getClass().getSimpleName());
        }
    }

    private void warn(String operation, String category) {
        long now = System.currentTimeMillis();
        long previous = warnedAt.get();
        if (now - previous > 30_000 && warnedAt.compareAndSet(previous, now)) {
            log.warn("Service telemetry write failed operation={} category={}", operation, category);
        }
    }

    private static Long value(JsonNode root, String key) {
        if (root == null) return null;
        var node = root.path(key);
        return node.isIntegralNumber() && node.canConvertToLong()
                && node.asLong() >= 0 && node.asLong() <= 100_000_000 ? node.asLong() : null;
    }

    private String counters(JsonNode metadata, String field) throws Exception {
        if (metadata == null || !metadata.path(field).isObject()) return null;
        var node = metadata.path(field);
        var safe = new TreeMap<String, Long>();
        node.fieldNames().forEachRemaining(key -> {
            String[] names = key.split(":", -1);
            boolean allowed = field.equals("errors") ? PROVIDER_ERRORS.contains(key)
                    : names.length == 2 && (toolModes.get(names[0]) == FinAiToolMode.READ && READ_COUNTERS.contains(names[1])
                      || toolModes.get(names[0]) == FinAiToolMode.WRITE && "write_selected".equals(names[1]));
            Long count = value(node,key);
            if (allowed && count != null) safe.put(key,count);
        });
        return mapper.writeValueAsString(safe);
    }

    private String digest(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }
}
