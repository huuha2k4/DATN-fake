package com.finance.finance.modules.admin.service;

import com.finance.finance.modules.admin.dto.request.AdminBroadcastNotificationRequest;
import com.finance.finance.modules.admin.dto.request.AdminPaging;
import com.finance.finance.modules.admin.dto.response.AdminBroadcastLogItem;
import com.finance.finance.modules.admin.dto.response.AdminPage;
import com.finance.finance.modules.admin.repository.AdminReadQueries;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditSource;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static com.finance.finance.modules.admin.repository.AdminReadQueries.instant;
import static com.finance.finance.modules.admin.repository.AdminReadQueries.uuid;

@Service
@RequiredArgsConstructor
public class AdminBroadcastService {
    private static final String ELIGIBLE = """
            deleted_at IS NULL AND user_status = 'ACTIVE'
              AND (:audience = 'ALL'
                   OR (:audience = 'FREE_ONLY' AND subscription_tier = 'FREE')
                   OR (:audience = 'PREMIUM_ONLY' AND subscription_tier IN ('PREMIUM','ENTERPRISE')))
            """;
    private static final String CAMPAIGN_COLUMNS = """
            SELECT c.id, c.created_by, c.title, c.body, c.audience, c.priority, c.action_url, c.action_text,
                   c.expected_count, c.notification_count, c.status, c.created_at,
                   (SELECT count(*) FROM core.notifications n WHERE n.broadcast_campaign_id = c.id AND n.is_read) read_count
            """;
    private static final RowMapper<AdminBroadcastLogItem> CAMPAIGN = (rs, n) -> AdminBroadcastLogItem.builder()
            .id(uuid(rs, "id")).title(rs.getString("title")).body(rs.getString("body"))
            .targetAudience(rs.getString("audience")).priority(rs.getString("priority"))
            .actionUrl(rs.getString("action_url")).actionText(rs.getString("action_text"))
            .expectedCount(rs.getLong("expected_count")).recipientCount(rs.getLong("notification_count"))
            .readCount(rs.getLong("read_count")).status(rs.getString("status"))
            .createdBy(Objects.toString(uuid(rs, "created_by"), null)).createdAt(instant(rs,"created_at")).build();

    private final NamedParameterJdbcTemplate jdbc;
    private final AdminReadQueries reads;
    private final SystemAuditService audit;

    @Value("${app.admin.broadcast-worker-enabled:true}")
    private boolean workerEnabled;

    @Transactional
    public AdminBroadcastLogItem enqueue(UUID id, AdminBroadcastNotificationRequest request) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var actor = (User) auth.getPrincipal();
        String title = request.getTitle().trim();
        String body = request.getBody().trim();
        String audience = option(request.getTargetAudience(), "ALL", Set.of("ALL","PREMIUM_ONLY","FREE_ONLY"));
        String priority = option(request.getPriority(), "NORMAL", Set.of("LOW","NORMAL","HIGH","URGENT"));
        priority = "URGENT".equals(priority) ? "HIGH" : priority;
        String url = normalized(request.getActionUrl());
        String text = normalized(request.getActionText());
        if (url != null && (!url.startsWith("/") || url.startsWith("//") || url.indexOf(92) >= 0
                || url.chars().anyMatch(ch -> Character.isISOControl(ch) || Character.isWhitespace(ch)))) {
            throw new IllegalArgumentException("Link thông báo phải là đường dẫn nội bộ");
        }

        var args = new MapSqlParameterSource("id", id).addValue("actor", actor.getId())
                .addValue("title", title).addValue("body", body).addValue("audience", audience)
                .addValue("priority", priority).addValue("url", url).addValue("text", text);
        int created = jdbc.update("""
                INSERT INTO core.broadcast_campaigns (id, created_by, title, body, audience, priority,
                                                     action_url, action_text, expected_count, created_at)
                SELECT :id, :actor, :title, :body, :audience, :priority, :url, :text, count(*), clock_timestamp()
                FROM core.users WHERE
                """ + ELIGIBLE + " ON CONFLICT (id) DO NOTHING", args);
        var campaign = jdbc.queryForObject(CAMPAIGN_COLUMNS + " FROM core.broadcast_campaigns c WHERE id = :id", args, CAMPAIGN);
        if (created == 0) {
            if (!Objects.equals(campaign.getCreatedBy(), actor.getId().toString()) || !title.equals(campaign.getTitle())
                    || !body.equals(campaign.getBody()) || !audience.equals(campaign.getTargetAudience())
                    || !priority.equals(campaign.getPriority()) || !Objects.equals(url, campaign.getActionUrl())
                    || !Objects.equals(text, campaign.getActionText())) {
                throw new IllegalArgumentException("Khóa gửi đã được dùng cho nội dung khác");
            }
            return campaign;
        }
        audit.record(AuditEventRequest.builder().eventType(AuditEventType.ADMIN_RESOURCE_MUTATION)
                .source(AuditSource.ADMIN_PORTAL).resourceType("BROADCAST_CAMPAIGN").resourceId(id)
                .reasonCode("BROADCAST_QUEUED").metadata(Map.of("expectedRecipients", campaign.getExpectedCount())).build());
        return campaign;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminPage<AdminBroadcastLogItem> history(String search, boolean legacy, AdminPaging page) {
        var args = new MapSqlParameterSource("search", AdminPaging.search(search));
        if (legacy) {
            return reads.page("SELECT n.id, n.title, n.priority, n.created_at", """
                    FROM core.notifications n WHERE n.broadcast_campaign_id IS NULL AND n.type = 'SYSTEM'
                      AND n.deleted_at IS NULL
                      AND (:search = '' OR strpos(lower(n.title), :search) > 0)
                    """, "n.created_at", "n.id", args, page, (rs,n) -> AdminBroadcastLogItem.builder()
                    .id(uuid(rs,"id")).title(rs.getString("title"))
                    .priority(rs.getString("priority")).status("LEGACY").legacy(true)
                    .createdAt(rs.getObject("created_at", java.time.LocalDateTime.class)
                            .atZone(AdminReadQueries.REPORT_ZONE).toInstant()).build());
        }
        return reads.page(CAMPAIGN_COLUMNS, """
                FROM core.broadcast_campaigns c WHERE (:search = '' OR strpos(lower(c.title), :search) > 0)
                """, "c.created_at", "c.id", args, page, CAMPAIGN);
    }

    @Scheduled(fixedDelayString = "${app.admin.broadcast-worker-interval-ms:1000}")
    @Transactional
    public void runWorker() {
        if (workerEnabled) dispatchBatch();
    }

    @Transactional
    public void dispatchBatch() {
        var ids = jdbc.queryForList("""
                SELECT id FROM core.broadcast_campaigns WHERE status <> 'COMPLETED'
                ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
                """, Map.of(), UUID.class);
        if (ids.isEmpty()) return;
        jdbc.update("""
                WITH campaign AS (SELECT * FROM core.broadcast_campaigns WHERE id = :id),
                recipients AS MATERIALIZED (
                    SELECT u.id FROM core.users u
                    WHERE u.deleted_at IS NULL AND u.user_status = 'ACTIVE'
                      AND EXISTS (SELECT 1 FROM campaign c
                          WHERE u.created_at <= c.created_at AND (c.last_user_id IS NULL OR u.id > c.last_user_id)
                            AND (c.audience = 'ALL'
                              OR (c.audience = 'FREE_ONLY' AND u.subscription_tier = 'FREE')
                              OR (c.audience = 'PREMIUM_ONLY' AND u.subscription_tier IN ('PREMIUM','ENTERPRISE'))))
                    ORDER BY u.id LIMIT 500
                ),
                inserted AS (
                    INSERT INTO core.notifications (user_id, type, priority, title, body, action_url, action_text,
                                                     created_at, broadcast_campaign_id)
                    SELECT r.id, 'SYSTEM', c.priority, c.title, c.body, c.action_url, c.action_text,
                           now() AT TIME ZONE 'Asia/Ho_Chi_Minh', c.id
                    FROM recipients r CROSS JOIN campaign c
                    ON CONFLICT (broadcast_campaign_id, user_id) DO NOTHING RETURNING id
                ),
                batch AS (SELECT (SELECT id FROM recipients ORDER BY id DESC LIMIT 1) last_id,
                                 (SELECT count(*) FROM recipients) scanned,
                                 (SELECT count(*) FROM inserted) inserted_count)
                UPDATE core.broadcast_campaigns c
                SET notification_count = c.notification_count + b.inserted_count,
                    last_user_id = coalesce(b.last_id, c.last_user_id),
                    status = CASE WHEN b.scanned < 500 THEN 'COMPLETED' ELSE 'PROCESSING' END,
                    completed_at = CASE WHEN b.scanned < 500 THEN now() END
                FROM batch b WHERE c.id = :id
                """, Map.of("id", ids.getFirst()));
    }

    private static String normalized(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static String option(String value, String defaultValue, Set<String> allowed) {
        String result = value == null ? defaultValue : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(result)) throw new IllegalArgumentException("Giá trị lựa chọn không hợp lệ");
        return result;
    }
}
