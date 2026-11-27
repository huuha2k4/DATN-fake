package com.finance.finance.modules.admin.monitoring;

import com.finance.finance.modules.admin.dto.request.AdminPaging;
import com.finance.finance.modules.admin.dto.response.AdminPage;
import com.finance.finance.modules.admin.repository.AdminReadQueries;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OperationMetricReader {
    private static final Set<String> AI_OPERATIONS = Set.of("FINAI_ASSISTANT", "AI_BALANCE_FORECAST",
            "AI_FINANCIAL_FORECAST", "AI_ANOMALY", "AI_BEHAVIOR", "AI_RECOMMENDATIONS");
    private static final Set<String> OCR_OPERATIONS = Set.of("OCR_SCAN", "OCR_TRANSACTION");
    private static final String PERIOD = " WHERE started_at >= :start AND started_at < :end AND operation IN (:operations)";
    private final NamedParameterJdbcTemplate jdbc;
    private final AdminReadQueries pages;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Map<String, Object> summary(String service, LocalDate from, LocalDate to) {
        var params = period(service, from, to);
        boolean ai = service.equals("ai");
        var aggregate = jdbc.queryForMap("""
                SELECT count(*) requests, count(distinct subject_hash) unique_users,
                       count(*) FILTER (WHERE outcome = 'SUCCESS') succeeded,
                       count(*) FILTER (WHERE outcome = 'FAILED') failed,
                       count(*) FILTER (WHERE outcome = 'REJECTED') rejected,
                       round(100.0 * count(*) FILTER (WHERE outcome = 'SUCCESS') /
                             nullif(count(*) FILTER (WHERE outcome <> 'REJECTED'), 0), 2) success_rate,
                       avg(duration_ms) FILTER (WHERE outcome <> 'REJECTED') average_ms,
                       CASE WHEN count(*) FILTER (WHERE outcome <> 'REJECTED') >= 20 THEN
                         percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE outcome <> 'REJECTED')
                       END p50_ms,
                       CASE WHEN count(*) FILTER (WHERE outcome <> 'REJECTED') >= 20 THEN
                         percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE outcome <> 'REJECTED')
                       END p95_ms,
                       sum(input_tokens) input_tokens, sum(output_tokens) output_tokens,
                       sum(input_tokens + output_tokens) total_tokens,
                       sum(model_rounds) rounds, sum(provider_calls) provider_calls, sum(provider_retries) provider_retries,
                       coalesce(sum(attempts - 1), 0) retry_attempts,
                       avg(confidence) FILTER (WHERE receipt_saved AND outcome = 'SUCCESS') average_confidence,
                       count(*) FILTER (WHERE needs_review AND outcome = 'SUCCESS') needs_review,
                       count(*) FILTER (WHERE receipt_saved AND outcome = 'SUCCESS') receipts_saved,
                       sum(engine_calls) engine_calls, sum(engine_ms) / nullif(sum(engine_calls),0) engine_average_ms
                FROM ops.service_request_metrics
                """ + PERIOD + " AND operation <> 'OCR_TRANSACTION'", params);
        var trend = jdbc.queryForList("""
                SELECT (started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS local_date, operation,
                    count(*) requests, count(*) FILTER (WHERE outcome = 'FAILED') failed,
                    count(*) FILTER (WHERE outcome = 'SUCCESS') succeeded
                FROM ops.service_request_metrics
                """ + PERIOD + " GROUP BY 1, 2 ORDER BY 1, 2", params);
        var operations = jdbc.queryForList("""
                SELECT operation, count(*) requests, count(*) FILTER (WHERE outcome = 'SUCCESS') succeeded,
                       count(*) FILTER (WHERE outcome = 'FAILED') failed,
                       count(*) FILTER (WHERE outcome = 'REJECTED') rejected,
                       avg(duration_ms) FILTER (WHERE outcome <> 'REJECTED') average_ms, max(started_at) last_seen,
                       max(started_at) FILTER (WHERE outcome = 'SUCCESS') last_success
                FROM ops.service_request_metrics
                """ + PERIOD + " GROUP BY 1 ORDER BY 1", params);
        var errors = jdbc.queryForList("""
                SELECT outcome, error_code, count(*) occurrences FROM ops.service_request_metrics
                """ + PERIOD + " AND error_code IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 2", params);
        var first = jdbc.queryForObject("""
                SELECT min(started_at) FROM ops.service_request_metrics WHERE operation IN (:operations)
                """, params, OffsetDateTime.class);
        var output = new LinkedHashMap<String, Object>();
        output.put("aggregate", aggregate);
        output.put("operations", operations);
        output.put("errors", errors);
        output.put("trend", trend);
        output.put("firstObservedAt", first);
        var outTime = period(service, LocalDate.now(AdminReadQueries.REPORT_ZONE), LocalDate.now(AdminReadQueries.REPORT_ZONE));
        output.put("todayRequests", jdbc.queryForObject("SELECT count(*) FROM ops.service_request_metrics"
                + PERIOD + " AND operation <> 'OCR_TRANSACTION'", outTime, Long.class));
        if (ai) addAiMetrics(output, params);
        return output;
    }

    private void addAiMetrics(Map<String, Object> output, MapSqlParameterSource params) {
        output.put("providers", jdbc.queryForList("""
                SELECT provider, model, sum(provider_calls) calls, sum(provider_retries) retries, sum(model_rounds) rounds,
                       sum(input_tokens) input_tokens, sum(output_tokens) output_tokens,
                       sum(provider_ms) / nullif(sum(provider_calls),0) average_ms,
                       max(provider_last_success) last_success
                FROM ops.service_request_metrics
                """ + PERIOD + " AND provider IS NOT NULL GROUP BY 1,2 ORDER BY 1,2", params));
        output.put("providerErrors", jdbc.queryForList("""
                SELECT provider,model,e.key code,sum(e.value::bigint) occurrences
                FROM ops.service_request_metrics CROSS JOIN LATERAL jsonb_each_text(provider_errors) e
                """ + PERIOD + " GROUP BY 1,2,3 ORDER BY 1,2,3", params));
        output.put("tools", jdbc.queryForList("""
                SELECT split_part(t.key, ':', 1) tool, split_part(t.key, ':', 2) metric, sum(t.value::bigint) value
                FROM ops.service_request_metrics CROSS JOIN LATERAL jsonb_each_text(tool_calls) t
                """ + PERIOD + " GROUP BY 1,2 ORDER BY 1,2", params));
        output.put("responses", jdbc.queryForList("""
                SELECT response_type, count(*) occurrences FROM ops.service_request_metrics
                """ + PERIOD + " AND outcome = 'SUCCESS' AND response_type IS NOT NULL GROUP BY 1 ORDER BY 1", params));
        output.put("actions", jdbc.queryForMap("""
                SELECT count(*) FILTER (WHERE created_at >= :start AND created_at < :end) proposals,
                       count(*) FILTER (WHERE status = 'PENDING' AND expires_at > now()) pending_now,
                       count(*) FILTER (WHERE confirmed_at >= :start AND confirmed_at < :end) confirmed,
                       count(*) FILTER (WHERE status = 'COMPLETED' AND executed_at >= :start AND executed_at < :end) committed,
                       (SELECT count(DISTINCT action_id) FROM core.finai_action_audit_logs
                        WHERE event = 'CANCELLED' AND created_at >= :start AND created_at < :end) cancelled,
                       (SELECT count(DISTINCT action_id) FROM core.finai_action_audit_logs
                        WHERE event = 'EXPIRED' AND created_at >= :start AND created_at < :end) expired,
                       (SELECT count(DISTINCT action_id) FROM core.finai_action_audit_logs
                        WHERE event = 'FAILED' AND created_at >= :start AND created_at < :end) failed
                FROM core.finai_pending_actions
                """, params));
        output.put("actionExecution", jdbc.queryForList("""
                SELECT tool_name, status, count(*) occurrences,
                       avg(extract(epoch FROM (executed_at - confirmed_at))*1000)
                         FILTER (WHERE executed_at >= confirmed_at) confirmation_to_commit_ms
                FROM core.finai_pending_actions
                WHERE status IN ('COMPLETED','FAILED') AND confirmed_at >= :start AND confirmed_at < :end
                GROUP BY 1,2 ORDER BY 1,2
                """, params));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminPage<Map<String,Object>> requests(String service, LocalDate from, LocalDate to, String search,
            String outcome, String operation, String model, String error, AdminPaging page) {
        var params = period(service, from, to);
        params.addValue("search", filter(search, "[A-Za-z0-9_-]{1,64}"));
        params.addValue("model", filter(model, "[A-Za-z0-9._/-]{1,80}"));
        if (error != null && !error.isBlank() && !RequestObservation.ERRORS.contains(error)) {
            throw new IllegalArgumentException("Invalid error code");
        }
        params.addValue("error", error == null ? "" : error);
        if (outcome != null && !outcome.isBlank() && !Set.of("SUCCESS","FAILED","REJECTED").contains(outcome)) {
            throw new IllegalArgumentException("Invalid outcome");
        }
        if (operation != null && !operation.isBlank() && !operations(service).contains(operation)) {
            throw new IllegalArgumentException("Invalid operation");
        }
        params.addValue("outcome", outcome == null ? "" : outcome);
        params.addValue("operation", operation == null ? "" : operation);
        return pages.page("""
                SELECT id, request_id, operation, started_at, duration_ms, outcome, error_code, response_type,
                       provider, model, input_tokens, output_tokens, model_rounds, provider_calls, provider_retries,
                       provider_ms,
                       (SELECT sum(t.value::bigint) FROM jsonb_each_text(tool_calls) t
                        WHERE split_part(t.key, ':', 2) IN ('read_ok','read_error','write_selected')) tool_call_count,
                       engine, engine_calls, engine_ms, confidence, needs_review, receipt_saved, attempts
                """, "FROM ops.service_request_metrics" + PERIOD + """
                AND (:search = '' OR strpos(request_id,:search) = 1)
                AND (:outcome = '' OR outcome = :outcome) AND (:operation = '' OR operation = :operation)
                AND (:model = '' OR model = :model) AND (:error = '' OR error_code = :error)
                """, "started_at", "id", params, page, (rs,n) -> {
                    var row = new LinkedHashMap<String,Object>();
                    var metadata = rs.getMetaData();
                    for (int i = 1; i <= metadata.getColumnCount(); i++) {
                        String key = metadata.getColumnLabel(i);
                        row.put(key, "started_at".equals(key) ? rs.getObject(i, OffsetDateTime.class) : rs.getObject(i));
                    }
                    return row;
                });
    }

    @Transactional(readOnly = true)
    public Map<String,Object> dashboard() {
        LocalDate today = LocalDate.now(AdminReadQueries.REPORT_ZONE);
        var scope = period("ai", today, today);
        return jdbc.queryForMap("""
                SELECT count(*) FILTER (WHERE operation = 'FINAI_ASSISTANT') finai_requests,
                       round(100.0 * count(*) FILTER (WHERE operation = 'FINAI_ASSISTANT' AND outcome = 'FAILED') /
                            nullif(count(*) FILTER (WHERE operation = 'FINAI_ASSISTANT' AND outcome <> 'REJECTED'),0),2) finai_error_rate,
                       count(*) FILTER (WHERE operation = 'OCR_SCAN') ocr_requests,
                       round(100.0 * count(*) FILTER (WHERE operation = 'OCR_SCAN' AND outcome = 'FAILED') /
                            nullif(count(*) FILTER (WHERE operation = 'OCR_SCAN' AND outcome <> 'REJECTED'),0),2) ocr_error_rate,
                       (SELECT count(*) FROM core.feedbacks WHERE status IN ('PENDING','IN_PROGRESS')) open_feedback
                FROM ops.service_request_metrics WHERE started_at >= :start AND started_at < :end
                """, scope);
    }

    private static MapSqlParameterSource period(String service, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to) || ChronoUnit.DAYS.between(from,to) >= 90
                || to.isAfter(LocalDate.now(AdminReadQueries.REPORT_ZONE))) {
            throw new IllegalArgumentException("Chọn khoảng thời gian hợp lệ, tối đa 90 ngày");
        }
        return new MapSqlParameterSource("start", from.atStartOfDay(AdminReadQueries.REPORT_ZONE).toOffsetDateTime())
                .addValue("end", to.plusDays(1).atStartOfDay(AdminReadQueries.REPORT_ZONE).toOffsetDateTime())
                .addValue("operations", operations(service));
    }

    private static Set<String> operations(String service) {
        return switch (service) {
            case "ai" -> AI_OPERATIONS;
            case "ocr" -> OCR_OPERATIONS;
            default -> throw new IllegalArgumentException("Unsupported monitoring service");
        };
    }

    private static String filter(String value, String regex) {
        if (value == null || value.isBlank()) return "";
        if (!value.matches(regex)) throw new IllegalArgumentException("Invalid monitoring filter");
        return value;
    }
}
