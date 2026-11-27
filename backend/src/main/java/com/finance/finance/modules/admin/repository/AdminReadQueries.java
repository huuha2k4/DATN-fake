package com.finance.finance.modules.admin.repository;

import com.finance.finance.modules.admin.dto.request.AdminPaging;
import com.finance.finance.modules.admin.dto.response.AdminAuditLogItem;
import com.finance.finance.modules.admin.dto.response.AdminFeedbackItem;
import com.finance.finance.modules.admin.dto.response.AdminOcrOverviewResponse.AdminOcrItemResponse;
import com.finance.finance.modules.admin.dto.response.AdminPage;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class AdminReadQueries {
    public static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final NamedParameterJdbcTemplate jdbc;

    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminUserListItem> users(
            String search, com.finance.finance.common.enums.UserStatus status,
            com.finance.finance.common.enums.SubscriptionTier tier, AdminPaging page) {
        return page("""
                SELECT u.id, u.email, CASE WHEN u.username IS NULL OR btrim(u.username) = ''
                                           OR strpos(u.username, '@') > 0 THEN split_part(u.email,'@',1)
                                           ELSE u.username END username,
                       u.full_name, u.email_verified, u.phone, u.user_status, u.system_role, u.subscription_tier,
                       u.subscription_expires_at, u.avatar_url, u.last_login_at, u.created_at
                """, """
                FROM core.users u WHERE u.deleted_at IS NULL
                  AND (:status = '' OR u.user_status = :status)
                  AND (:tier = '' OR u.subscription_tier = :tier)
                  AND (:search = '' OR strpos(lower(concat_ws(' ', u.email, u.username, u.full_name, u.phone)),
                              :search) > 0)
                """, "u.created_at", "u.id", filters(search).addValue("status", status == null ? "" : status.name())
                .addValue("tier", tier == null ? "" : tier.name()), page, (rs,n) ->
                new com.finance.finance.modules.admin.dto.response.AdminUserListItem(
                        uuid(rs,"id"), rs.getString("email"), rs.getString("username"), rs.getString("full_name"),
                        rs.getBoolean("email_verified"), rs.getString("phone"),
                        com.finance.finance.common.enums.UserStatus.valueOf(rs.getString("user_status")),
                        com.finance.finance.common.enums.SystemRole.valueOf(rs.getString("system_role")),
                        com.finance.finance.common.enums.SubscriptionTier.valueOf(rs.getString("subscription_tier")),
                        instant(rs,"subscription_expires_at"), rs.getString("avatar_url"),
                        instant(rs,"last_login_at"), instant(rs,"created_at")));
    }

    public AdminPage<AdminOcrItemResponse> receipts(String search, Boolean review, AdminPaging page) {
        var args = filters(search).addValue("review", review, java.sql.Types.BOOLEAN);
        return page("""
                SELECT r.id, r.confidence, r.needs_review, r.created_at
                """, """
                FROM core.receipts r
                WHERE (CAST(:review AS boolean) IS NULL OR r.needs_review = :review)
                  AND (:search = '' OR strpos(r.id::text, :search) = 1)
                """, "r.created_at", "r.id", args, page, (rs, n) -> AdminOcrItemResponse.builder()
                .id(uuid(rs,"id"))
                .confidence(rs.getBigDecimal("confidence")).needsReview(rs.getBoolean("needs_review"))
                .createdAt(instant(rs,"created_at")).build());
    }

    public AdminPage<AdminFeedbackItem> feedback(String search, String status, String category, AdminPaging page) {
        return page("""
                SELECT f.id, f.user_id, f.title, f.content, f.status, f.category, f.priority,
                       f.admin_reply, f.replied_at, f.created_at, f.processed_by, f.processed_at,
                       f.updated_at, u.full_name, u.email
                """, """
                FROM core.feedbacks f LEFT JOIN core.users u ON u.id = f.user_id AND u.deleted_at IS NULL
                WHERE (:status = '' OR f.status = :status) AND (:category = '' OR f.category = :category)
                  AND (:search = '' OR strpos(lower(f.title), :search) > 0
                       OR strpos(lower(f.content), :search) > 0
                       OR strpos(lower(coalesce(u.full_name,'')), :search) > 0
                       OR strpos(lower(coalesce(u.email,'')), :search) > 0)
                """, "f.created_at", "f.id", filters(search)
                .addValue("status", code(status)).addValue("category", code(category)), page,
                (rs, n) -> AdminFeedbackItem.builder().id(uuid(rs,"id")).userId(uuid(rs,"user_id"))
                .userFullName(rs.getString("full_name")).userEmail(rs.getString("email"))
                .title(rs.getString("title")).content(rs.getString("content")).status(rs.getString("status"))
                .category(rs.getString("category")).priority(rs.getString("priority"))
                .adminReply(rs.getString("admin_reply")).repliedAt(instant(rs,"replied_at"))
                .processedBy(uuid(rs,"processed_by")).processedAt(instant(rs,"processed_at"))
                .updatedAt(instant(rs,"updated_at")).createdAt(instant(rs,"created_at")).build());
    }

    public AdminPage<AdminAuditLogItem> legacyAudit(String search, String action, String target, AdminPaging page) {
        return page("""
                SELECT id, admin_username, admin_full_name, action, target_entity, target_id,
                       description, ip_address, status, created_at
                """, """
                FROM core.audit_logs
                WHERE (:action = '' OR action = :action) AND (:target = '' OR target_entity = :target)
                  AND (:search = '' OR strpos(lower(concat_ws(' ', admin_username, admin_full_name, action,
                              target_entity, target_id, description, ip_address)), :search) > 0)
                """, "created_at", "id", filters(search).addValue("action", code(action))
                .addValue("target", code(target)), page, (rs,n) -> AdminAuditLogItem.builder()
                .id(uuid(rs,"id")).adminUsername(rs.getString("admin_username")).adminFullName(rs.getString("admin_full_name"))
                .action(rs.getString("action")).targetEntity(rs.getString("target_entity")).targetId(rs.getString("target_id"))
                .description(rs.getString("description")).ipAddress(rs.getString("ip_address"))
                .status(rs.getString("status")).createdAt(instant(rs,"created_at")).build());
    }

    public Map<String, Object> userMetrics(LocalDate today) {
        return jdbc.queryForMap("""
                SELECT count(*) total, count(*) FILTER (WHERE user_status = 'ACTIVE') active,
                       count(*) FILTER (WHERE user_status IN ('LOCKED','DISABLED')) locked,
                       count(*) FILTER (WHERE user_status = 'PENDING') pending,
                       count(*) FILTER (WHERE coalesce(subscription_tier,'FREE') = 'FREE') free,
                       count(*) FILTER (WHERE subscription_tier = 'PREMIUM') premium,
                       count(*) FILTER (WHERE subscription_tier = 'ENTERPRISE') enterprise,
                       count(*) FILTER (WHERE created_at >= :today AND created_at < :end) new_today,
                       count(*) FILTER (WHERE created_at >= :month AND created_at < :end) new_month,
                       count(*) FILTER (WHERE last_login_at >= :today AND last_login_at < :end) dau,
                       count(*) FILTER (WHERE last_login_at >= :week AND last_login_at < :end) wau,
                       count(*) FILTER (WHERE last_login_at >= :period AND last_login_at < :end) mau
                FROM core.users WHERE deleted_at IS NULL
                """, dateParams(today));
    }

    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminAiSessionItem> aiSessions(String search, AdminPaging page) {
        return page("""
                SELECT s.id, s.created_at, s.updated_at,
                       (SELECT count(*) FROM core.ai_chat_messages m WHERE m.session_id = s.id) message_count
                """, """
                FROM core.ai_chat_sessions s JOIN core.users u ON u.id = s.user_id AND u.deleted_at IS NULL
                WHERE (:search = '' OR strpos(CAST(s.id AS text), :search) > 0)
                """, "s.updated_at", "s.id", filters(search),
                page, (rs,n) -> new com.finance.finance.modules.admin.dto.response.AdminAiSessionItem(
                        uuid(rs,"id"), rs.getLong("message_count"), instant(rs,"created_at"), instant(rs,"updated_at")));
    }

    public Map<String, Object> receiptMetrics(LocalDate today) {
        var args = new MapSqlParameterSource().addValue("today", day(today))
                .addValue("month", day(today.withDayOfMonth(1))).addValue("end", day(today.plusDays(1)));
        return jdbc.queryForMap("""
                SELECT count(*) total, count(*) FILTER (WHERE needs_review) review, avg(confidence) confidence,
                       count(*) FILTER (WHERE transaction_id IS NOT NULL) linked_transactions,
                       count(*) FILTER (WHERE created_at >= :today AND created_at < :end) new_today,
                       count(*) FILTER (WHERE created_at >= :month AND created_at < :end) new_month
                FROM core.receipts
                """, args);
    }

    public Map<String, Object> volumes() {
        return jdbc.queryForMap("""
                SELECT (SELECT count(*) FROM core.transactions WHERE deleted_at IS NULL) transactions,
                       (SELECT count(*) FROM core.groups WHERE deleted_at IS NULL) groups,
                       (SELECT count(*) FROM core.receipts) receipts,
                       (SELECT count(*) FROM core.budgets WHERE deleted_at IS NULL) budgets,
                       (SELECT count(*) FROM core.goals WHERE deleted_at IS NULL) goals,
                       (SELECT count(*) FROM core.debts WHERE deleted_at IS NULL) debts
                """, Map.of());
    }

    public Map<LocalDate, Long> registrationTrend(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT CAST(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS date) AS report_date, count(*) n
                FROM core.users WHERE deleted_at IS NULL AND created_at >= :start AND created_at < :end GROUP BY 1
                """, Map.of("start", day(start), "end", day(end)), AdminReadQueries::dailyCounts);
    }

    public Map<LocalDate, Long> transactionTrend(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT occurred_date AS report_date, count(*) n FROM core.transactions
                WHERE deleted_at IS NULL AND occurred_date >= :start AND occurred_date < :end GROUP BY 1
                """, Map.of("start", start, "end", end), AdminReadQueries::dailyCounts);
    }

    public <T> AdminPage<T> page(String select, String from, String timestamp, String id,
                                 MapSqlParameterSource args, AdminPaging page, RowMapper<T> mapper) {
        long total = jdbc.queryForObject("SELECT count(*) " + from, args, Long.class);
        args.addValue("limit", page.size()).addValue("offset", (long) page.page() * page.size());
        var size = (int) Math.min(Integer.MAX_VALUE, total / page.size() + (total % page.size() == 0 ? 0 : 1));
        var dir = page.direction();
        var rows = total <= (long) page.page() * page.size() ? java.util.List.<T>of() : jdbc.query(
                select + " " + from + " ORDER BY " + timestamp + " " + dir + " NULLS LAST, " + id + " " + dir
                        + " LIMIT :limit OFFSET :offset", args, mapper);
        return new AdminPage<>(rows, page.page(), page.size(), total, size);
    }

    public static Instant instant(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    public static UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    public static long count(Map<String, Object> totals, String key) {
        return ((Number) totals.get(key)).longValue();
    }

    private static Map<LocalDate, Long> dailyCounts(ResultSet rs) throws SQLException {
        var values = new java.util.HashMap<LocalDate, Long>();
        while (rs.next()) values.put(rs.getObject("report_date", LocalDate.class), rs.getLong("n"));
        return values;
    }

    private static java.time.OffsetDateTime day(LocalDate date) {
        return date.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
    }

    private static MapSqlParameterSource filters(String search) {
        return new MapSqlParameterSource("search", AdminPaging.search(search));
    }

    private static String code(String value) {
        return value == null ? "" : value.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private static MapSqlParameterSource dateParams(LocalDate today) {
        return new MapSqlParameterSource().addValue("today", day(today)).addValue("month", day(today.withDayOfMonth(1)))
                .addValue("end", day(today.plusDays(1))).addValue("week", day(today.minusDays(6)))
                .addValue("period", day(today.minusDays(29)));
    }
}
