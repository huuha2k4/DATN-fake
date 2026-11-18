package com.finance.finance.modules.admin.controller;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.modules.admin.dto.request.AdminUpdateUserRequest;
import com.finance.finance.modules.admin.dto.response.AdminDashboardOverviewResponse;
import com.finance.finance.modules.admin.service.AdminService;
import com.finance.finance.modules.user.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // 1. Tổng quan
    @GetMapping("/dashboard/overview")
    public ResponseEntity<AdminDashboardOverviewResponse> getDashboardOverview() {
        AdminDashboardOverviewResponse data = adminService.getDashboardOverview();
        return ResponseEntity.ok(data);
    }

    // 2. Quản lý Người dùng
    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> listUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) UserStatus status,
            @RequestParam(value = "tier", required = false) SubscriptionTier tier,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> result = adminService.listUsers(search, status, tier, pageable);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable("userId") UUID userId,
            @RequestBody AdminUpdateUserRequest request
    ) {
        UserResponse updated = adminService.updateUser(userId, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/users/{userId}/toggle-block")
    public ResponseEntity<UserResponse> toggleBlockUser(@PathVariable("userId") UUID userId) {
        UserResponse updated = adminService.toggleBlockUser(userId);
        return ResponseEntity.ok(updated);
    }

    // 3. Vai trò & Phân quyền
    @GetMapping("/roles")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.AdminRoleStatResponse>> getRoles() {
        return ResponseEntity.ok(adminService.getRoleStatistics());
    }

    // 4. Danh mục Hệ thống
    @GetMapping("/categories")
    public ResponseEntity<java.util.List<com.finance.finance.modules.category.dto.response.CategoryResponse>> getSystemCategories() {
        return ResponseEntity.ok(adminService.getSystemCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<com.finance.finance.modules.category.dto.response.CategoryResponse> createSystemCategory(
            @jakarta.validation.Valid @RequestBody com.finance.finance.modules.admin.dto.request.AdminSystemCategoryRequest request) {
        return ResponseEntity.ok(adminService.createSystemCategory(request));
    }

    @PutMapping("/categories/{categoryId}")
    public ResponseEntity<com.finance.finance.modules.category.dto.response.CategoryResponse> updateSystemCategory(
            @PathVariable("categoryId") UUID categoryId,
            @jakarta.validation.Valid @RequestBody com.finance.finance.modules.admin.dto.request.AdminSystemCategoryRequest request) {
        return ResponseEntity.ok(adminService.updateSystemCategory(categoryId, request));
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<Void> deleteSystemCategory(@PathVariable("categoryId") UUID categoryId) {
        adminService.deleteSystemCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    // 5. Quản lý OCR Hóa đơn
    @GetMapping("/ocr/overview")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.AdminOcrOverviewResponse> getOcrOverview() {
        return ResponseEntity.ok(adminService.getOcrOverview());
    }

    // 6. Thống kê sử dụng
    @GetMapping("/analytics")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.AdminAnalyticsResponse> getAnalyticsOverview() {
        return ResponseEntity.ok(adminService.getAnalyticsOverview());
    }

    // 7. Phản hồi & Hỗ trợ
    @GetMapping("/feedbacks")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.AdminFeedbackItem>> listFeedbacks(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "category", required = false) String category
    ) {
        return ResponseEntity.ok(adminService.listFeedbacks(status, category));
    }

    @PostMapping("/feedbacks/{feedbackId}/reply")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.AdminFeedbackItem> replyFeedback(
            @PathVariable("feedbackId") UUID feedbackId,
            @jakarta.validation.Valid @RequestBody com.finance.finance.modules.admin.dto.request.AdminReplyFeedbackRequest request
    ) {
        return ResponseEntity.ok(adminService.replyFeedback(feedbackId, request));
    }

    // 8. Thông báo Hệ thống (Broadcast)
    @GetMapping("/broadcast")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.AdminBroadcastLogItem>> listBroadcastLogs() {
        return ResponseEntity.ok(adminService.listBroadcastLogs());
    }

    @PostMapping("/broadcast")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.AdminBroadcastLogItem> broadcastNotification(
            @jakarta.validation.Valid @RequestBody com.finance.finance.modules.admin.dto.request.AdminBroadcastNotificationRequest request
    ) {
        return ResponseEntity.ok(adminService.broadcastNotification(request));
    }

    // 8.1. Cấu hình Mẫu Thông báo Tự động (Templates theo chu kỳ / sự kiện)
    @GetMapping("/notification-templates")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse>> listNotificationTemplates() {
        return ResponseEntity.ok(adminService.listNotificationTemplates());
    }

    @PutMapping("/notification-templates/{templateId}")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse> updateNotificationTemplate(
            @PathVariable("templateId") UUID templateId,
            @jakarta.validation.Valid @RequestBody com.finance.finance.modules.admin.dto.request.UpdateNotificationTemplateRequest request
    ) {
        return ResponseEntity.ok(adminService.updateNotificationTemplate(templateId, request));
    }

    @PostMapping("/notification-templates/{templateId}/toggle")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.NotificationTemplateResponse> toggleNotificationTemplate(
            @PathVariable("templateId") UUID templateId
    ) {
        return ResponseEntity.ok(adminService.toggleNotificationTemplate(templateId));
    }

    // 9. Nhật ký Hoạt động Quản trị (Audit Logs)
    @GetMapping("/audit-logs")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.AdminAuditLogItem>> listAuditLogs(
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "targetEntity", required = false) String targetEntity
    ) {
        return ResponseEntity.ok(adminService.listAuditLogs(action, targetEntity));
    }

    // 10. Giám sát Hệ thống (System Health)
    @GetMapping("/system-health")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse> getSystemHealth() {
        return ResponseEntity.ok(adminService.getSystemHealth());
    }

    // 11. Cấu hình Hệ thống (System Settings)
    @GetMapping("/settings")
    public ResponseEntity<java.util.List<com.finance.finance.modules.admin.dto.response.SystemSettingItem>> listSettings(
            @RequestParam(value = "group", required = false) String group
    ) {
        return ResponseEntity.ok(adminService.listSettings(group));
    }

    @PutMapping("/settings/{key}")
    public ResponseEntity<com.finance.finance.modules.admin.dto.response.SystemSettingItem> updateSetting(
            @PathVariable("key") String key,
            @RequestBody java.util.Map<String, String> body
    ) {
        String value = body.getOrDefault("value", "");
        return ResponseEntity.ok(adminService.updateSetting(key, value));
    }
}
