package com.finance.finance.modules.admin.service;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.modules.admin.dto.request.AdminUpdateUserRequest;
import com.finance.finance.modules.admin.dto.response.AdminDashboardOverviewResponse;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditSource;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.mapper.UserMapper;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.finance.finance.modules.admin.dto.request.AdminPaging;
import com.finance.finance.modules.admin.dto.response.AdminPage;

import static com.finance.finance.modules.admin.repository.AdminReadQueries.count;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final com.finance.finance.modules.admin.monitoring.ServiceHealthMonitor serviceHealth;
    private final com.finance.finance.modules.admin.repository.AdminReadQueries adminReads;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final com.finance.finance.modules.notification.service.NotificationService notifications;
    private final TransactionRepository transactionRepository;
    private final com.finance.finance.modules.category.repository.CategoryRepository categoryRepository;
    private final com.finance.finance.modules.feedback.repository.FeedbackRepository feedbackRepository;
    private final com.finance.finance.modules.admin.repository.NotificationTemplateRepository notificationTemplateRepository;
    private final com.finance.finance.modules.admin.repository.SystemSettingRepository systemSettingRepository;
    private final com.finance.finance.modules.auth.repository.RefreshTokenRepository refreshTokenRepository;
    private final com.finance.finance.modules.auth.repository.AuthTokenRepository authTokenRepository;
    private final com.finance.finance.modules.analytics.client.AiAnalyticsClient aiAnalyticsClient;
    private final javax.sql.DataSource dataSource;
    private final UserMapper userMapper;

    private final SystemAuditService systemAuditService;
    private final com.finance.finance.modules.auth.repository.OAuthAccountRepository oauthAccountRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.admin.monitoring.SystemMetricsSampler systemMetricsSampler;

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional(readOnly = true)
    public AdminDashboardOverviewResponse getDashboardOverview() {
        LocalDate today = LocalDate.now(ZONE_VN);
        var totals = adminReads.userMetrics(today);
        var volumes = adminReads.volumes();
        var daily = adminReads.registrationTrend(today.minusDays(6), today.plusDays(1));
        var userGrowth = java.util.stream.IntStream.rangeClosed(0, 6)
                .mapToObj(i -> today.minusDays(6 - i))
                .map(date -> new AdminDashboardOverviewResponse.DailyMetricPoint(
                        date.toString(), daily.getOrDefault(date, 0L))).toList();

        // System health metrics
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memoryBean.getHeapMemoryUsage().getUsed() / (1024 * 1024);
        long heapMaxBytes = memoryBean.getHeapMemoryUsage().getMax();

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("heapMemoryUsedMB", heapUsed);
        health.put("heapMemoryMaxMB", heapMaxBytes < 0 ? null : heapMaxBytes / (1024 * 1024));
        health.put("uptimeHours", ManagementFactory.getRuntimeMXBean().getUptime() / (1000 * 3600));

        return AdminDashboardOverviewResponse.builder()
                .totalUsers(count(totals, "total"))
                .activeUsers(count(totals, "active"))
                .lockedUsers(count(totals, "locked"))
                .pendingUsers(count(totals, "pending"))
                .newUsersToday(count(totals, "new_today"))
                .newUsersThisMonth(count(totals, "new_month"))
                .freeUsers(count(totals, "free"))
                .premiumUsers(count(totals, "premium"))
                .enterpriseUsers(count(totals, "enterprise"))
                .totalGroups(count(volumes, "groups"))
                .totalTransactions(count(volumes, "transactions"))
                .totalReceiptsScanned(count(volumes, "receipts"))
                .userGrowth(userGrowth)
                .systemHealth(health)
                .build();
    }

    // ==================== Quản lý Người dùng ====================

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminUserListItem> listUsers(
            String search, UserStatus status, SubscriptionTier tier, AdminPaging page) {
        return adminReads.users(search, status, tier, page);
    }

    @Transactional
    public UserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = lockUser(userId);
        UserStatus previousStatus = user.getUserStatus();

        if (request.getFullName() != null) {
            String name = request.getFullName().trim();
            if (name.isEmpty() || name.length() > 100 || name.chars().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException("Họ tên không hợp lệ");
            }
            user.setFullName(name);
        }
        if (request.getUserStatus() != null && request.getUserStatus() != previousStatus) {
            requireManageableUser(user);
            if (Set.of(UserStatus.DELETED, UserStatus.PENDING).contains(request.getUserStatus())
                    || (request.getUserStatus() == UserStatus.LOCKED && previousStatus != UserStatus.ACTIVE)) {
                throw new IllegalArgumentException("Không thể chuyển sang trạng thái tài khoản này");
            }
            changeStatus(user, request.getUserStatus());
        }
        if (request.getSystemRole() != null && request.getSystemRole() != user.getSystemRole()) {
            denyUserMutation("SINGLE_ADMIN_ROLE_LOCKED");
        }
        var oldTier = user.getSubscriptionTier();
        var tier = request.getSubscriptionTier() == null ? oldTier : request.getSubscriptionTier();
        Integer extension = request.getExtendSubscriptionDays();
        Instant now = Instant.now();
        var expiry = user.getSubscriptionExpiresAt();
        if (extension != null && (extension < 1 || extension > 365 || tier == SubscriptionTier.FREE)) {
            throw new IllegalArgumentException("Chỉ gia hạn gói trả phí từ 1 đến 365 ngày");
        }
        if (tier == SubscriptionTier.FREE) {
            expiry = null;
        } else if (extension != null) {
            expiry = (expiry != null && expiry.isAfter(now) ? expiry : now).plus(extension, ChronoUnit.DAYS);
        } else if (tier != oldTier && (expiry == null || !expiry.isAfter(now))) {
            throw new IllegalArgumentException("Khi đổi sang gói trả phí cần chọn thời hạn");
        }
        user.setSubscriptionTier(tier);
        user.setSubscriptionExpiresAt(expiry);
        if (request.getEmailVerified() != null) {
            user.setEmailVerified(request.getEmailVerified());
            user.setEmailVerifiedAt(Boolean.TRUE.equals(request.getEmailVerified())
                    ? Objects.requireNonNullElse(user.getEmailVerifiedAt(), now) : null);
        }

        user = userRepository.save(user);
        log.info("Admin updated user [{}]: status={}, role={}, tier={}", user.getId(), user.getUserStatus(), user.getSystemRole(), user.getSubscriptionTier());
        if (previousStatus != user.getUserStatus()) {
            auditStatusChange(user, previousStatus, "ADMIN_USER_UPDATE");
        } else {
            auditMutation("USER_UPDATE", "USER", userId, userId, Map.of());
        }
        return userMapper.toResponse(user);
    }

    @Transactional
    public UserResponse toggleBlockUser(UUID userId) {
        User user = lockUser(userId);
        requireManageableUser(user);
        UserStatus previous = user.getUserStatus();
        if (previous != UserStatus.ACTIVE && previous != UserStatus.LOCKED) {
            denyUserMutation("INVALID_LOCK_TRANSITION");
        }
        changeStatus(user, previous == UserStatus.LOCKED ? UserStatus.ACTIVE : UserStatus.LOCKED);
        auditStatusChange(user, previous, "ADMIN_TOGGLE_BLOCK");
        return userMapper.toResponse(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = lockUser(userId);
        requireManageableUser(user);
        user.markAsDeleted();
        revokeSessions(user);
        oauthAccountRepository.deleteAllByUserId(userId);
        for (var type : com.finance.finance.common.enums.TokenType.values()) {
            authTokenRepository.invalidateUserTokensByType(userId, type, Instant.now());
        }
        auditMutation("USER_DELETE", "USER", userId, userId, Map.of());
    }

    // 3. Quản lý Vai trò & Phân quyền
    @Transactional(readOnly = true)
    public List<com.finance.finance.modules.admin.dto.response.AdminRoleStatResponse> getRoleStatistics() {
        long adminCount = userRepository.countBySystemRoleAndDeletedAtIsNull(com.finance.finance.common.enums.SystemRole.ADMIN);
        long userCount = userRepository.countBySystemRoleAndDeletedAtIsNull(com.finance.finance.common.enums.SystemRole.USER);

        return List.of(
                com.finance.finance.modules.admin.dto.response.AdminRoleStatResponse.builder()
                        .role("ADMIN")
                        .name("Quản trị viên Hệ thống (System Admin)")
                        .description("Toàn quyền giám sát, quản lý tài khoản, cấu hình hạn mức, AI/OCR và vận hành toàn hệ thống. Tuyệt đối không can thiệp số dư cá nhân.")
                        .totalAccounts(adminCount)
                        .permissions(List.of(
                                "Xem Dashboard & Giám sát máy chủ",
                                "Quản lý & Cập nhật người dùng (Khóa/Mở khóa/Cấp quyền)",
                                "Quản lý Hạn mức FinAI & OCR Token",
                                "Cấu hình Danh mục hệ thống & Gói cước",
                                "Phát thông báo hệ thống toàn cầu",
                                "Truy xuất Nhật ký bảo mật (Audit Logs)"
                        ))
                        .isSystemProtected(true)
                        .build(),
                com.finance.finance.modules.admin.dto.response.AdminRoleStatResponse.builder()
                        .role("USER")
                        .name("Người dùng Phổ thông (Member)")
                        .description("Tài khoản người dùng cá nhân hoặc gia đình, sử dụng dịch vụ quản lý tài chính, ví chi tiêu, quét hóa đơn và hỏi đáp FinAI.")
                        .totalAccounts(userCount)
                        .permissions(List.of(
                                "Quản lý ví tài chính cá nhân",
                                "Ghi nhận thu chi & Lập ngân sách",
                                "Quét hóa đơn OCR trích xuất tự động",
                                "Tương tác với trợ lý tài chính FinAI",
                                "Tham gia & tạo nhóm chi tiêu chung"
                        ))
                        .isSystemProtected(false)
                        .build()
        );
    }

    // 4. Quản lý Danh mục Hệ thống (System Categories)
    @Transactional(readOnly = true)
    public List<com.finance.finance.modules.category.dto.response.CategoryResponse> getSystemCategories() {
        List<com.finance.finance.modules.category.entity.Category> categories = categoryRepository.findSystemCategories();
        return categories.stream().map(c -> com.finance.finance.modules.category.dto.response.CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .code(c.getCode())
                .kind(c.getKind())
                .type(c.getKind())
                .icon(c.getIcon())
                .color(c.getColor())
                .isSystem(true)
                .isCustom(false)
                .parentId(c.getParentId())
                .displayOrder(c.getDisplayOrder() != null ? (int) c.getDisplayOrder() : 0)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public com.finance.finance.modules.category.dto.response.CategoryResponse createSystemCategory(
            com.finance.finance.modules.admin.dto.request.AdminSystemCategoryRequest request) {
        categoryRepository.lockSystemCategoryMutations();
        String code = request.getCode();
        if (code == null || code.isBlank()) {
            code = "SYS_" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
        }
        code = code.trim();
        validateCategory(request, code, null);
        com.finance.finance.modules.category.entity.Category category = com.finance.finance.modules.category.entity.Category.builder()
                .name(request.getName().trim())
                .code(code)
                .kind(request.getKind())
                .icon(request.getIcon() != null ? request.getIcon().trim() : "tag")
                .color(request.getColor() != null ? request.getColor().trim() : "#07543f")
                .parentId(request.getParentId())
                .isSystem(true)
                .userId(null)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder().shortValue() : (short) 0)
                .build();

        category = categoryRepository.save(category);
        auditMutation("CATEGORY_CREATE", "CATEGORY", category.getId(), null, Map.of());

        return com.finance.finance.modules.category.dto.response.CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .code(category.getCode())
                .kind(category.getKind())
                .type(category.getKind())
                .icon(category.getIcon())
                .color(category.getColor())
                .isSystem(true)
                .parentId(category.getParentId())
                .displayOrder(category.getDisplayOrder() != null ? (int) category.getDisplayOrder() : 0)
                .createdAt(category.getCreatedAt())
                .build();
    }

    @Transactional
    public com.finance.finance.modules.category.dto.response.CategoryResponse updateSystemCategory(
            UUID categoryId, com.finance.finance.modules.admin.dto.request.AdminSystemCategoryRequest request) {
        categoryRepository.lockSystemCategoryMutations();
        var category = requireSystemCategory(categoryId);
        String code = request.getCode() == null || request.getCode().isBlank()
                ? category.getCode() : request.getCode().trim();
        validateCategory(request, code, categoryId);
        if (request.getKind() != category.getKind()
                && (transactionRepository.existsByCategoryId(categoryId)
                    || categoryRepository.existsByParentIdAndDeletedAtIsNull(categoryId))) {
            throw new IllegalArgumentException("Cannot change the kind of a referenced category");
        }

        category.setName(request.getName().trim());
        if (request.getCode() != null && !request.getCode().isBlank()) {
            category.setCode(request.getCode().trim());
        }
        if (request.getKind() != null) {
            category.setKind(request.getKind());
        }
        if (request.getIcon() != null) {
            category.setIcon(request.getIcon().trim());
        }
        if (request.getColor() != null) {
            category.setColor(request.getColor().trim());
        }
        category.setParentId(request.getParentId());
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder().shortValue());
        }

        category = categoryRepository.save(category);
        auditMutation("CATEGORY_UPDATE", "CATEGORY", categoryId, null, Map.of());

        return com.finance.finance.modules.category.dto.response.CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .code(category.getCode())
                .kind(category.getKind())
                .type(category.getKind())
                .icon(category.getIcon())
                .color(category.getColor())
                .isSystem(true)
                .parentId(category.getParentId())
                .displayOrder(category.getDisplayOrder() != null ? (int) category.getDisplayOrder() : 0)
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    @Transactional
    public void deleteSystemCategory(UUID categoryId) {
        categoryRepository.lockSystemCategoryMutations();
        var category = requireSystemCategory(categoryId);
        if (categoryRepository.existsByParentIdAndDeletedAtIsNull(categoryId)) {
            throw new IllegalArgumentException("Cannot delete a category with active children");
        }
        category.markAsDeleted();
        auditMutation("CATEGORY_DELETE", "CATEGORY", categoryId, null, Map.of());
    }

    private com.finance.finance.modules.category.entity.Category requireSystemCategory(UUID id) {
        return categoryRepository.findSystemCategoryForUpdate(id).orElseThrow(() ->
                new IllegalArgumentException("System category not found"));
    }

    private void validateCategory(com.finance.finance.modules.admin.dto.request.AdminSystemCategoryRequest request,
                                  String code, UUID categoryId) {
        if (request.getName() == null || request.getName().isBlank() || request.getName().trim().length() > 100
                || request.getKind() == null || code == null || !code.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,49}")
                || (request.getIcon() != null && !request.getIcon().trim().matches("[A-Za-z0-9_-]{1,50}"))
                || (request.getColor() != null && !request.getColor().trim().matches("#[A-Fa-f0-9]{6}"))
                || (request.getDisplayOrder() != null
                    && (request.getDisplayOrder() < 0 || request.getDisplayOrder() > Short.MAX_VALUE))) {
            throw new IllegalArgumentException("Invalid system category fields");
        }
        if (categoryRepository.codeUsedByOtherCategory(code, categoryId)) {
            throw new IllegalArgumentException("Category code already exists");
        }
        if (categoryRepository.systemCategoryNameUsed(
                request.getName().trim(), request.getKind(), request.getParentId(), categoryId)) {
            throw new IllegalArgumentException("System category name already exists in this group");
        }
        Set<UUID> visited = new HashSet<>();
        if (categoryId != null) {
            visited.add(categoryId);
        }
        for (UUID parentId = request.getParentId(); parentId != null;) {
            if (!visited.add(parentId)) {
                throw new IllegalArgumentException("Category hierarchy cannot contain a cycle");
            }
            var parent = requireSystemCategory(parentId);
            if (parent.getKind() != request.getKind()) {
                throw new IllegalArgumentException("Parent category must have the same kind");
            }
            parentId = parent.getParentId();
        }
    }

    // 5. Quản lý OCR Hóa đơn (Receipts)
    @Transactional(readOnly = true)
    public com.finance.finance.modules.admin.dto.response.AdminOcrOverviewResponse getOcrOverview() {
        var totals = adminReads.receiptMetrics(LocalDate.now(ZONE_VN));
        Number confidence = (Number) totals.get("confidence");
        return com.finance.finance.modules.admin.dto.response.AdminOcrOverviewResponse.builder()
                .totalScanned(count(totals, "total"))
                .scannedToday(count(totals, "new_today"))
                .scannedThisMonth(count(totals, "new_month"))
                .needReviewCount(count(totals, "review"))
                .linkedTransactions(count(totals, "linked_transactions"))
                .averageConfidence(confidence == null ? null : confidence.doubleValue())
                .build();
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminOcrOverviewResponse.AdminOcrItemResponse>
            listOcrReceipts(String search, Boolean review, AdminPaging page) {
        return adminReads.receipts(search, review, page);
    }

    // 6. Thống kê sử dụng (Usage Analytics & Metrics)
    @Transactional(readOnly = true)
    public com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse getAnalyticsOverview() {
        LocalDate today = LocalDate.now(ZONE_VN);
        LocalDate start = today.minusDays(13);
        var totals = adminReads.userMetrics(today);
        var volumes = adminReads.volumes();
        long dau = count(totals, "dau");
        long wau = count(totals, "wau");
        long mau = count(totals, "mau");
        long totalTxs = count(volumes, "transactions");
        long totalGroups = count(volumes, "groups");
        long totalReceipts = count(volumes, "receipts");
        long totalBudgets = count(volumes, "budgets");
        long totalGoals = count(volumes, "goals");
        long totalDebts = count(volumes, "debts");
        var registrations = adminReads.registrationTrend(start, today.plusDays(1));
        var transactions = adminReads.transactionTrend(start, today.plusDays(1));
        var trend = java.util.stream.IntStream.range(0, 14).mapToObj(start::plusDays)
                .map(day -> com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.DailyActivityPoint.builder()
                        .date(day.toString()).newUsers(registrations.getOrDefault(day, 0L))
                        .transactionCount(transactions.getOrDefault(day, 0L)).build()).toList();

        // 4. Cơ cấu Tính năng tính toán 100% từ Database thực
        long totalEvents = totalTxs + totalReceipts + totalGroups + totalBudgets + totalGoals + totalDebts;
        if (totalEvents == 0) totalEvents = 1;

        List<com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric> features = List.of(
                com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric.builder()
                        .featureName("Ghi nhận Thu & Chi")
                        .icon("arrows")
                        .totalEvents(totalTxs)
                        .percentage(Math.round(((double) totalTxs / totalEvents) * 1000.0) / 10.0)
                        .build(),
                com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric.builder()
                        .featureName("Quét hóa đơn OCR")
                        .icon("receipt")
                        .totalEvents(totalReceipts)
                        .percentage(Math.round(((double) totalReceipts / totalEvents) * 1000.0) / 10.0)
                        .build(),
                com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric.builder()
                        .featureName("Chi tiêu Nhóm & Gia đình")
                        .icon("users")
                        .totalEvents(totalGroups)
                        .percentage(Math.round(((double) totalGroups / totalEvents) * 1000.0) / 10.0)
                        .build(),
                com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric.builder()
                        .featureName("Quản lý Ngân sách & Mục tiêu")
                        .icon("chart")
                        .totalEvents(totalBudgets + totalGoals)
                        .percentage(Math.round(((double) (totalBudgets + totalGoals) / totalEvents) * 1000.0) / 10.0)
                        .build(),
                com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.FeatureUsageMetric.builder()
                        .featureName("Theo dõi Công nợ")
                        .icon("credit-card")
                        .totalEvents(totalDebts)
                        .percentage(Math.round(((double) totalDebts / totalEvents) * 1000.0) / 10.0)
                        .build()
        );

        return com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse.builder()
                .totalUsers(count(totals, "total"))
                .activeUsersDAU(dau)
                .activeUsersWAU(wau)
                .activeUsersMAU(mau)
                .totalTransactions(totalTxs)
                .totalGroups(totalGroups)
                .totalReceipts(totalReceipts)
                .activityTrend(trend)
                .featureUsages(features)
                .build();
    }

    // 7. Quản lý Phản hồi & Hỗ trợ (Feedbacks & Support) - LƯU & ĐỌC DATABASE THẬT
    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminFeedbackItem> listFeedbacks(
            String search, String status, String category, AdminPaging page) {
        return adminReads.feedback(search, status, category, page);
    }

    @Transactional
    public com.finance.finance.modules.admin.dto.response.AdminFeedbackItem replyFeedback(
            UUID feedbackId, UUID requestId, com.finance.finance.modules.admin.dto.request.AdminReplyFeedbackRequest request) {
        var feedback = feedbackRepository.lockForAdmin(feedbackId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phản hồi"));
        var actor = (User) org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        String reply = request.getReply() == null ? "" : request.getReply().trim();
        String status = AdminBroadcastService.option(request.getStatus(), "RESOLVED",
                Set.of("PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"));
        String hash = feedbackRequestHash(status, reply);
        var history = jdbc.query("""
                SELECT feedback_id, processed_by, request_hash FROM core.feedback_history WHERE id = ?
                """, (rs,n) -> new FeedbackReplay(rs.getObject("feedback_id", UUID.class),
                        rs.getObject("processed_by", UUID.class), rs.getString("request_hash")), requestId);
        if (!history.isEmpty()) {
            if (!history.getFirst().equals(new FeedbackReplay(feedbackId, actor.getId(), hash))) {
                throw new IllegalArgumentException("Khóa phản hồi đã được dùng cho nội dung khác");
            }
            return feedbackItem(feedback);
        }
        if (request.getExpectedUpdatedAt() == null || !request.getExpectedUpdatedAt().equals(feedback.getUpdatedAt())) {
            throw new com.finance.finance.common.exception.BusinessException(
                    "Phản hồi đã thay đổi, vui lòng tải lại", "FEEDBACK_CHANGED", org.springframework.http.HttpStatus.CONFLICT);
        }
        String previous = feedback.getStatus();
        boolean statusChanged = !previous.equals(status);
        if (statusChanged && (!Set.of("PENDING", "IN_PROGRESS").contains(previous) || "PENDING".equals(status))) {
            throw new IllegalArgumentException("Không thể chuyển sang trạng thái này");
        }
        boolean replyChanged = !reply.isBlank() && !reply.equals(feedback.getAdminReply());
        if (!statusChanged && !replyChanged) return feedbackItem(feedback);

        Instant now = Instant.now();
        feedback.setStatus(status);
        feedback.setProcessedBy(actor.getId());
        feedback.setProcessedAt(now);
        if (replyChanged) {
            feedback.setAdminReply(reply);
            feedback.setRepliedAt(now);
        }
        jdbc.update("""
                INSERT INTO core.feedback_history (id, feedback_id, processed_by, previous_status, next_status, request_hash)
                VALUES (?, ?, ?, ?, ?, ?)
                """, requestId, feedbackId, actor.getId(), previous, status, hash);
        if (feedback.getUserId() != null && (replyChanged || Set.of("RESOLVED", "REJECTED").contains(status))) {
            notifications.createNotification(feedback.getUserId(), com.finance.finance.common.enums.NotificationType.SYSTEM,
                    com.finance.finance.common.enums.NotificationPriority.NORMAL, "Có cập nhật về phản hồi của bạn",
                    replyChanged ? "Finora đã gửi phản hồi. Mở mục Hỗ trợ & Góp ý để xem chi tiết."
                            : "Finora đã cập nhật kết quả xử lý. Mở mục Hỗ trợ & Góp ý để xem chi tiết.",
                    "/feedback", "Xem phản hồi");
        }
        auditMutation("FEEDBACK_UPDATE", "FEEDBACK", feedbackId, feedback.getUserId(),
                Map.of("previousStatus", previous, "nextStatus", status, "replyChanged", replyChanged));
        return feedbackItem(feedbackRepository.saveAndFlush(feedback));
    }

    private static String feedbackRequestHash(String status, String reply) {
        try {
            return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest((status + "\n" + reply).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private record FeedbackReplay(UUID feedbackId, UUID actor, String hash) { }

    private com.finance.finance.modules.admin.dto.response.AdminFeedbackItem feedbackItem(
            com.finance.finance.modules.feedback.entity.Feedback feedback) {
        var user = feedback.getUserId() == null ? null : userRepository.findActiveUserById(feedback.getUserId()).orElse(null);
        return com.finance.finance.modules.admin.dto.response.AdminFeedbackItem.builder()
                .id(feedback.getId()).userId(feedback.getUserId()).userFullName(user == null ? null : user.getFullName())
                .userEmail(user == null ? null : user.getEmail()).title(feedback.getTitle()).content(feedback.getContent())
                .category(feedback.getCategory()).priority(feedback.getPriority()).status(feedback.getStatus())
                .adminReply(feedback.getAdminReply()).repliedAt(feedback.getRepliedAt()).createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt()).processedAt(feedback.getProcessedAt())
                .processedBy(feedback.getProcessedBy()).build();
    }

    // 8.1. Mẫu Thông báo Tự động theo Chu kỳ & Sự kiện (Automation Notification Templates)
    @Transactional(readOnly = true)
    public List<com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse> listNotificationTemplates() {
        return notificationTemplateRepository.findAll(org.springframework.data.domain.Sort.by("code"))
                .stream().map(this::templateItem).toList();
    }

    @Transactional
    public com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse updateNotificationTemplate(
            UUID templateId, com.finance.finance.modules.admin.dto.request.UpdateNotificationTemplateRequest request) {
        var template = editableTemplate(templateId);
        if (request.getScheduleCron() != null && !request.getScheduleCron().isBlank()) {
            if (template.getScheduleCron() == null || !template.getScheduleCron().equals(request.getScheduleCron().trim())) {
                throw new IllegalArgumentException("Lịch gửi cố định theo scheduler");
            }
        }
        if (request.getTargetAudience() != null && !request.getTargetAudience().isBlank()) {
            String audience = request.getTargetAudience().trim();
            if (!List.of("ALL", "FREE_ONLY", "PREMIUM_ONLY").contains(audience)) {
                throw new IllegalArgumentException("Đối tượng nhận không hợp lệ");
            }
            template.setTargetAudience(audience);
        }
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            String priority = request.getPriority().trim().toUpperCase(java.util.Locale.ROOT);
            if (!List.of("LOW", "NORMAL", "HIGH", "URGENT").contains(priority)) {
                throw new IllegalArgumentException("Mức độ ưu tiên không hợp lệ");
            }
            template.setPriority(priority);
        }

        template.setTitle(request.getTitle().trim());
        template.setBodyTemplate(request.getBodyTemplate().trim());
        if (request.getIsActive() != null) template.setIsActive(request.getIsActive());
        auditMutation("TEMPLATE_UPDATE", "NOTIFICATION_TEMPLATE", templateId, null, Map.of());
        return templateItem(template);
    }

    @Transactional
    public com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse toggleNotificationTemplate(UUID templateId) {
        var template = editableTemplate(templateId);
        template.setIsActive(!Boolean.TRUE.equals(template.getIsActive()));
        auditMutation("TEMPLATE_TOGGLE", "NOTIFICATION_TEMPLATE", templateId, null, Map.of());
        return templateItem(template);
    }

    private com.finance.finance.modules.admin.entity.NotificationTemplate editableTemplate(UUID id) {
        return notificationTemplateRepository.lockById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mẫu thông báo"));
    }

    private com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse templateItem(
            com.finance.finance.modules.admin.entity.NotificationTemplate t) {
        return com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse.builder()
                .id(t.getId()).code(t.getCode()).title(t.getTitle()).bodyTemplate(t.getBodyTemplate())
                .triggerEvent(t.getTriggerEvent()).scheduleCron(t.getScheduleCron())
                .targetAudience(t.getTargetAudience()).priority(t.getPriority())
                .isActive(t.getIsActive()).editable(true)
                .totalDispatched(t.getTotalDispatched())
                .lastDispatchedAt(t.getLastDispatchedAt()).createdAt(t.getCreatedAt()).build();
    }


    private User lockUser(UUID id) {
        return userRepository.lockActiveRecord(id).orElseThrow(() ->
                new IllegalArgumentException("User not found"));
    }

    private void requireManageableUser(User user) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (user.isAdmin() || (auth != null && auth.getPrincipal() instanceof User actor
                && actor.getId().equals(user.getId()))) {
            denyUserMutation("PROTECTED_ADMIN_ACCOUNT");
        }
    }

    private void denyUserMutation(String reason) {
        throw new com.finance.finance.common.exception.BusinessException(
                "Không thể thực hiện thao tác với trạng thái tài khoản này",
                reason, org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private void changeStatus(User user, UserStatus status) {
        user.setUserStatus(status);
        revokeSessions(user);
        if (status == UserStatus.ACTIVE) {
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
        }
    }

    private void revokeSessions(User user) {
        user.setSessionVersion(user.getSessionVersion() + 1);
        refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
    }

    private void auditStatusChange(User user, UserStatus previous, String reason) {
        var event = user.getUserStatus() == UserStatus.ACTIVE
                ? AuditEventType.ADMIN_USER_REACTIVATED : AuditEventType.ADMIN_USER_SUSPENDED;
        systemAuditService.record(AuditEventRequest.builder().eventType(event)
                .source(AuditSource.ADMIN_PORTAL).resourceType("USER").resourceId(user.getId())
                .subjectUserId(user.getId()).reasonCode(reason)
                .oldValues(Map.of("userStatus", previous.name()))
                .newValues(Map.of("userStatus", user.getUserStatus().name())).build());
    }

    private void auditMutation(String action, String resource, UUID id, UUID subject, Map<String, Object> metadata) {
        systemAuditService.record(AuditEventRequest.builder().eventType(AuditEventType.ADMIN_RESOURCE_MUTATION)
                .source(AuditSource.ADMIN_PORTAL).resourceType(resource).resourceId(id)
                .subjectUserId(subject).reasonCode(action).metadata(metadata).build());
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminAuditLogItem> listAuditLogs(
            String search, String action, String targetEntity, AdminPaging page) {
        return adminReads.legacyAudit(search, action, targetEntity, page);
    }

    // 10. Giám sát Hệ thống (System Health & Infrastructure Monitor) - THẬT 100%
    public com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse getSystemHealth() {
        // 1. JVM Memory thật
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memoryBean.getHeapMemoryUsage().getUsed() / (1024 * 1024);
        long heapMaxBytes = memoryBean.getHeapMemoryUsage().getMax();
        Long heapMax = heapMaxBytes > 0 ? heapMaxBytes / (1024 * 1024) : null;
        long heapCommitted = memoryBean.getHeapMemoryUsage().getCommitted() / (1024 * 1024);
        Double heapPercent = heapMaxBytes > 0
                ? Math.round((double) memoryBean.getHeapMemoryUsage().getUsed() / heapMaxBytes * 1000.0) / 10.0 : null;
        long nonHeapUsed = memoryBean.getNonHeapMemoryUsage().getUsed() / (1024 * 1024);

        // 2. CPU & Threading thật
        java.lang.management.ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        int activeThreads = threadBean.getThreadCount();
        int peakThreads = threadBean.getPeakThreadCount();
        int availableProcessors = Runtime.getRuntime().availableProcessors();
        long loadedClasses = ManagementFactory.getClassLoadingMXBean().getLoadedClassCount();

        java.lang.management.OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        double systemLoad = osBean.getSystemLoadAverage();

        var infrastructure = serviceHealth.snapshot();
        var postgres = infrastructure.services().stream().filter(s -> "POSTGRESQL".equals(s.name()))
                .findFirst().orElseThrow();
        String dbStatus = "UP".equals(postgres.status()) ? "CONNECTED" : postgres.status();
        double processLoad = osBean instanceof com.sun.management.OperatingSystemMXBean cpu
                ? cpu.getProcessCpuLoad() : -1;
        double systemCpuLoad = osBean instanceof com.sun.management.OperatingSystemMXBean cpu
                ? cpu.getCpuLoad() : -1;
        Long sysTotalMB = null;
        Long sysUsedMB = null;
        Double sysUsagePct = null;
        if (osBean instanceof com.sun.management.OperatingSystemMXBean sunOs) {
            long totalMem = sunOs.getTotalMemorySize();
            long freeMem = sunOs.getFreeMemorySize();
            if (totalMem > 0) {
                sysTotalMB = totalMem / (1024 * 1024);
                sysUsedMB = Math.max(0L, totalMem - freeMem) / (1024 * 1024);
                sysUsagePct = Math.round((double) (totalMem - freeMem) / totalMem * 1000.0) / 10.0;
            }
        }
        var collectors = ManagementFactory.getGarbageCollectorMXBeans().stream()
                .map(gc -> new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.GcInfo(
                        gc.getName(), gc.getCollectionCount() < 0 ? null : gc.getCollectionCount(),
                        gc.getCollectionTime() < 0 ? null : gc.getCollectionTime())).toList();

        // 4. Ổ cứng (Disk Space) máy chủ thật
        java.io.File rootDrive = new java.io.File(".");
        long totalBytes = rootDrive.getTotalSpace();
        long freeBytes = rootDrive.getFreeSpace();
        long totalSpace = totalBytes / (1024 * 1024 * 1024);
        long freeSpace = freeBytes / (1024 * 1024 * 1024);
        long usableSpace = rootDrive.getUsableSpace() / (1024 * 1024 * 1024);
        Double diskUsagePercent = totalBytes > 0
                ? Math.round((double) (totalBytes - freeBytes) / totalBytes * 1000.0) / 10.0 : null;

        // 5. Uptime thật của Spring Boot Application
        long uptimeMillis = ManagementFactory.getRuntimeMXBean().getUptime();
        long startTimeMillis = ManagementFactory.getRuntimeMXBean().getStartTime();
        String startTimeFormatted = Instant.ofEpochMilli(startTimeMillis).atZone(ZONE_VN).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        var pool = dataSource instanceof com.zaxxer.hikari.HikariDataSource hikari ? hikari : null;
        var poolMetrics = pool == null ? null : pool.getHikariPoolMXBean();

        // 6. Thống kê lưu lượng & tỷ lệ lỗi 24h thật từ ops.service_request_metrics
        var hourlyTraffic = buildHourlyTraffic24h();
        long totalReq24h = hourlyTraffic.stream().mapToLong(
                com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.HourlyTrafficPoint::requests).sum();
        long failedReq24h = hourlyTraffic.stream().mapToLong(
                com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.HourlyTrafficPoint::failed).sum();
        Double errorRate24h = totalReq24h > 0
                ? Math.round((failedReq24h * 10000.0) / totalReq24h) / 100.0
                : 0.0;

        Double avgLatency24h = null;
        try {
            Double dbAvgMs = jdbc.queryForObject("""
                    SELECT avg(duration_ms) FROM ops.service_request_metrics
                    WHERE started_at >= NOW() - INTERVAL '24 hours' AND outcome <> 'REJECTED'
                    """, Double.class);
            if (dbAvgMs != null) {
                avgLatency24h = Math.round(dbAvgMs * 10.0) / 10.0;
            }
        } catch (Exception ignored) {}
        if (avgLatency24h == null) {
            var probeLatencies = infrastructure.services().stream()
                    .map(com.finance.finance.modules.admin.monitoring.ServiceHealthMonitor.ServiceResult::latencyMs)
                    .filter(Objects::nonNull)
                    .mapToLong(Long::longValue)
                    .toArray();
            if (probeLatencies.length > 0) {
                double sum = 0;
                for (long l : probeLatencies) sum += l;
                avgLatency24h = Math.round((sum / probeLatencies.length) * 10.0) / 10.0;
            }
        }

        Map<String, Double> serviceErrorRates = computeServiceErrorRates24h(infrastructure);
        var recentEvents = buildRecentSystemEvents(infrastructure);
        var perfHistory = systemMetricsSampler != null
                ? systemMetricsSampler.history()
                : List.<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.PerformanceSample>of();

        return com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.builder()
                .status(infrastructure.status())
                .serviceHealth(infrastructure)
                .garbageCollectors(collectors)
                .uptimeSeconds(uptimeMillis / 1000)
                .startTime(startTimeFormatted)
                .hourlyTraffic(hourlyTraffic)
                .performanceHistory(perfHistory)
                .traffic24h(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.TrafficSummary(
                        totalReq24h, failedReq24h, errorRate24h, avgLatency24h))
                .serviceErrorRates24h(serviceErrorRates)
                .recentEvents(recentEvents)
                .memory(com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.MemoryInfo.builder()
                        .heapUsedMB(heapUsed)
                        .heapMaxMB(heapMax)
                        .heapCommittedMB(heapCommitted)
                        .heapUsagePercent(heapPercent)
                        .nonHeapUsedMB(nonHeapUsed)
                        .systemTotalMB(sysTotalMB)
                        .systemUsedMB(sysUsedMB)
                        .systemUsagePercent(sysUsagePct)
                        .build())
                .cpu(com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.CpuInfo.builder()
                        .availableProcessors(availableProcessors)
                        .processCpuPercent(processLoad < 0 ? null : Math.round(processLoad * 1000.0) / 10.0)
                        .systemCpuPercent(systemCpuLoad < 0 ? null : Math.round(systemCpuLoad * 1000.0) / 10.0)
                        .systemLoadAverage(systemLoad >= 0 ? Math.round(systemLoad * 10.0) / 10.0 : null)
                        .activeThreadCount(activeThreads)
                        .peakThreadCount(peakThreads)
                        .totalLoadedClasses(loadedClasses)
                        .build())
                .database(com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.DatabaseHealthInfo.builder()
                        .status(dbStatus)
                        .pingTimeMs(postgres.latencyMs())
                        .activeConnections(poolMetrics == null ? null : poolMetrics.getActiveConnections())
                        .idleConnections(poolMetrics == null ? null : poolMetrics.getIdleConnections())
                        .pendingConnections(poolMetrics == null ? null : poolMetrics.getThreadsAwaitingConnection())
                        .maxPoolSize(pool == null ? null : pool.getMaximumPoolSize())
                        .build())
                .disk(com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.DiskInfo.builder()
                        .totalSpaceGB(totalSpace)
                        .freeSpaceGB(freeSpace)
                        .usableSpaceGB(usableSpace)
                        .diskUsagePercent(diskUsagePercent)
                        .build())
                .runtime(Map.of(
                        "javaVersion", System.getProperty("java.version"),
                        "javaVendor", System.getProperty("java.vendor"),
                        "osName", System.getProperty("os.name"),
                        "osArch", System.getProperty("os.arch"),
                        "timezone", ZONE_VN.getId()
                ))
                .build();
    }

    private List<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.HourlyTrafficPoint> buildHourlyTraffic24h() {
        Map<String, long[]> buckets = new LinkedHashMap<>();
        Map<String, Double> avgLatencies = new HashMap<>();
        ZonedDateTime nowHour = ZonedDateTime.now(ZONE_VN).truncatedTo(ChronoUnit.HOURS);
        DateTimeFormatter hourFmt = DateTimeFormatter.ofPattern("HH:00");
        DateTimeFormatter keyFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH");

        List<ZonedDateTime> hours = new ArrayList<>(24);
        for (int i = 23; i >= 0; i--) {
            ZonedDateTime slot = nowHour.minusHours(i);
            hours.add(slot);
            buckets.put(slot.format(keyFmt), new long[]{0L, 0L});
        }

        try {
            var rows = jdbc.queryForList("""
                    SELECT to_char(date_trunc('hour', started_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24') AS bucket,
                           count(*) AS reqs,
                           count(*) FILTER (WHERE outcome = 'FAILED') AS failed,
                           avg(duration_ms) FILTER (WHERE outcome <> 'REJECTED') AS avg_ms
                    FROM ops.service_request_metrics
                    WHERE started_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY 1
                    ORDER BY 1
                    """);
            for (var row : rows) {
                String key = Objects.toString(row.get("bucket"), "");
                if (buckets.containsKey(key)) {
                    long reqs = row.get("reqs") instanceof Number n ? n.longValue() : 0L;
                    long failed = row.get("failed") instanceof Number n ? n.longValue() : 0L;
                    buckets.put(key, new long[]{reqs, failed});
                    if (row.get("avg_ms") instanceof Number n) {
                        avgLatencies.put(key, Math.round(n.doubleValue() * 10.0) / 10.0);
                    }
                }
            }
        } catch (Exception ignored) {}

        List<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.HourlyTrafficPoint> result = new ArrayList<>(24);
        for (ZonedDateTime slot : hours) {
            String key = slot.format(keyFmt);
            long[] counts = buckets.get(key);
            result.add(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.HourlyTrafficPoint(
                    slot.format(hourFmt), counts[0], counts[1], avgLatencies.get(key)));
        }
        return result;
    }

    private Map<String, Double> computeServiceErrorRates24h(
            com.finance.finance.modules.admin.monitoring.ServiceHealthMonitor.Snapshot infrastructure) {
        Map<String, Double> rates = new LinkedHashMap<>();
        for (var svc : infrastructure.services()) {
            rates.put(svc.name(), "UP".equals(svc.status()) ? 0.0 : null);
        }
        try {
            var rows = jdbc.queryForList("""
                    SELECT CASE
                             WHEN operation IN ('OCR_SCAN', 'OCR_TRANSACTION') THEN 'OCR'
                             ELSE 'FINAI'
                           END AS svc,
                           count(*) AS total,
                           count(*) FILTER (WHERE outcome = 'FAILED') AS failed
                    FROM ops.service_request_metrics
                    WHERE started_at >= NOW() - INTERVAL '24 hours'
                    GROUP BY 1
                    """);
            for (var row : rows) {
                String svc = Objects.toString(row.get("svc"), "");
                long total = row.get("total") instanceof Number n ? n.longValue() : 0L;
                long failed = row.get("failed") instanceof Number n ? n.longValue() : 0L;
                if (total > 0) {
                    rates.put(svc, Math.round((failed * 10000.0) / total) / 100.0);
                }
            }
        } catch (Exception ignored) {}
        return rates;
    }

    private List<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem> buildRecentSystemEvents(
            com.finance.finance.modules.admin.monitoring.ServiceHealthMonitor.Snapshot infrastructure) {
        List<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem> events = new ArrayList<>();
        DateTimeFormatter tsFmt = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
        String checkedLabel = infrastructure.checkedAt().atZone(ZONE_VN).format(tsFmt);

        for (var svc : infrastructure.services()) {
            if ("DOWN".equals(svc.status()) || "DEGRADED".equals(svc.status())) {
                String ts = svc.checkedAt().atZone(ZONE_VN).format(tsFmt);
                events.add(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem(
                        "ERROR",
                        "Dịch vụ " + svc.name() + " gặp sự cố (" + (svc.errorCode() != null ? svc.errorCode() : svc.status()) + ")",
                        ts));
            }
        }

        try {
            var errRows = jdbc.queryForList("""
                    SELECT operation, error_code, started_at
                    FROM ops.service_request_metrics
                    WHERE outcome = 'FAILED' AND started_at >= NOW() - INTERVAL '24 hours'
                    ORDER BY started_at DESC
                    LIMIT 3
                    """);
            for (var row : errRows) {
                String op = Objects.toString(row.get("operation"), "REQUEST");
                String code = Objects.toString(row.get("error_code"), "ERROR");
                Object started = row.get("started_at");
                String ts = started instanceof java.sql.Timestamp t
                        ? t.toInstant().atZone(ZONE_VN).format(tsFmt)
                        : (started instanceof OffsetDateTime o ? o.atZoneSameInstant(ZONE_VN).format(tsFmt) : checkedLabel);
                events.add(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem(
                        "WARN", "Lỗi xử lý " + op + " (" + code + ")", ts));
            }
        } catch (Exception ignored) {}

        if ("UP".equals(infrastructure.status())) {
            events.add(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem(
                    "INFO", "Kiểm tra sức khỏe hệ thống (Health Check) thành công", checkedLabel));
        }
        for (var svc : infrastructure.services()) {
            if ("UP".equals(svc.status()) && List.of("BACKEND", "POSTGRESQL", "FINAI", "OCR").contains(svc.name())) {
                String label = switch (svc.name()) {
                    case "BACKEND" -> "Dịch vụ Spring Boot đã phản hồi ổn định";
                    case "POSTGRESQL" -> "Kết nối PostgreSQL bình thường";
                    case "FINAI" -> "FinAI Service sẵn sàng phản hồi";
                    case "OCR" -> "OCR Pipeline hoạt động bình thường";
                    default -> svc.name() + " ổn định";
                };
                events.add(new com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.SystemEventItem(
                        "INFO", label, svc.checkedAt().atZone(ZONE_VN).format(tsFmt)));
            }
        }
        return events.stream().limit(6).toList();
    }

    // 11. Cấu hình Hệ thống (System Settings) - LƯU VÀO DATABASE THẬT
    @Transactional(readOnly = true)
    public List<com.finance.finance.modules.admin.dto.response.SystemSettingItem> listSettings(String group) {
        var keys = Arrays.stream(AdminSettingDefinition.values()).map(Enum::name).toList();
        return systemSettingRepository.findAllById(keys).stream()
                .filter(s -> group == null || group.isBlank() || group.trim().equalsIgnoreCase(s.getGroup()))
                .map(this::settingItem).sorted(Comparator.comparing(
                        com.finance.finance.modules.admin.dto.response.SystemSettingItem::getKey)).toList();
    }

    @Transactional
    public com.finance.finance.modules.admin.dto.response.SystemSettingItem updateSetting(String key, String value) {
        var definition = AdminSettingDefinition.lookup(key);
        if (definition == null) throw new IllegalArgumentException("Cấu hình không được phép chỉnh sửa");
        String normalized = definition.normalize(value);
        var setting = systemSettingRepository.findById(key)
                .orElseThrow(() -> new IllegalArgumentException("Cấu hình chưa được khởi tạo"));
        if (!Objects.equals(setting.getValue(), normalized)) {
            setting.setValue(normalized);
            setting = systemSettingRepository.saveAndFlush(setting);
            auditMutation("SETTINGS_UPDATE", "SYSTEM_SETTING", null, null, Map.of("settingKey", key));
        }
        return settingItem(setting);
    }

    private com.finance.finance.modules.admin.dto.response.SystemSettingItem settingItem(
            com.finance.finance.modules.admin.entity.SystemSetting setting) {
        var definition = AdminSettingDefinition.valueOf(setting.getKey());
        return com.finance.finance.modules.admin.dto.response.SystemSettingItem.builder()
                .key(setting.getKey()).value(setting.getValue()).group(setting.getGroup())
                .description(setting.getDescription()).updatedAt(setting.getUpdatedAt())
                .editable(definition.editable).type(definition.type).min(definition.min).max(definition.max)
                .applies(definition.editable ? "IMMEDIATE" : "READ_ONLY").effect(definition.effect).build();
    }

    @Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public AdminPage<com.finance.finance.modules.admin.dto.response.AdminAiSessionItem> listAiSessions(String search, AdminPaging page) {
        return adminReads.aiSessions(search, page);
    }

    public Object getAiAdminStats() {
        return aiAnalyticsClient.get("/api/ai/admin/stats", null, java.util.Map.of());
    }
}
