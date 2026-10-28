package com.finance.finance.modules.notification.controller;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.modules.notification.dto.request.RegisterDeviceRequest;
import com.finance.finance.modules.notification.dto.request.UnregisterDeviceRequest;
import com.finance.finance.modules.notification.dto.response.*;
import com.finance.finance.modules.notification.service.NotificationDeviceService;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationDeviceService deviceService;

    /**
     * GET /api/v1/notifications - List notifications with filters
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(name = "is_read", required = false) Boolean isRead,
            @RequestParam(name = "type", required = false) NotificationType type,
            @RequestParam(name = "priority", required = false) NotificationPriority priority,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "page_size", defaultValue = "20") int pageSize
    ) {
        log.info("GET /api/v1/notifications - user: {}, isRead: {}, type: {}, priority: {}", 
                user.getId(), isRead, type, priority);

        NotificationListResponse response = notificationService.listNotifications(
                user.getId(), isRead, type, priority, page, pageSize
        );

        // Calculate pagination info
        int totalItems = response.getNotifications().size();
        int totalPages = (int) Math.ceil((double) totalItems / pageSize);

        Map<String, Object> paginationMap = new HashMap<>();
        paginationMap.put("page", page);
        paginationMap.put("page_size", pageSize);
        paginationMap.put("total_items", totalItems);
        paginationMap.put("total_pages", totalPages);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("pagination", paginationMap);

        return ResponseEntity.ok(responseBody);
    }

    /**
     * GET /api/v1/notifications/unread-count - Get unread count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal User user
    ) {
        log.info("GET /api/v1/notifications/unread-count - user: {}", user.getId());

        UnreadCountResponse response = notificationService.getUnreadCount(user.getId());

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);

        return ResponseEntity.ok(responseBody);
    }

    /**
     * PUT /api/v1/notifications/{id}/read - Mark notification as read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        log.info("PUT /api/v1/notifications/{}/read - user: {}", id, user.getId());

        MarkReadResponse response = notificationService.markAsRead(user.getId(), id);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", "Đã đánh dấu đã đọc");

        return ResponseEntity.ok(responseBody);
    }

    /**
     * PUT /api/v1/notifications/read-all - Mark all notifications as read
     */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @AuthenticationPrincipal User user
    ) {
        log.info("PUT /api/v1/notifications/read-all - user: {}", user.getId());

        BulkActionResponse response = notificationService.markAllAsRead(user.getId());

        String message = String.format("Đã đánh dấu %d thông báo đã đọc", response.getMarkedCount());
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", message);

        return ResponseEntity.ok(responseBody);
    }

    /**
     * DELETE /api/v1/notifications/{id} - Delete notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id
    ) {
        log.info("DELETE /api/v1/notifications/{} - user: {}", id, user.getId());

        notificationService.deleteNotification(user.getId(), id);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("message", "Thông báo đã được xóa");

        return ResponseEntity.ok(responseBody);
    }

    /**
     * DELETE /api/v1/notifications/clear-all - Clear all read notifications
     */
    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, Object>> clearAllRead(
            @AuthenticationPrincipal User user
    ) {
        log.info("DELETE /api/v1/notifications/clear-all - user: {}", user.getId());

        BulkActionResponse response = notificationService.clearAllRead(user.getId());

        String message = String.format("Đã xóa %d thông báo đã đọc", response.getDeletedCount());
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", message);

        return ResponseEntity.ok(responseBody);
    }

    /**
     * POST /api/v1/notifications/register-device - Register device for push notifications
     */
    @PostMapping("/register-device")
    public ResponseEntity<Map<String, Object>> registerDevice(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RegisterDeviceRequest request
    ) {
        log.info("POST /api/v1/notifications/register-device - user: {}, deviceType: {}", 
                user.getId(), request.getDeviceType());

        DeviceRegistrationResponse response = deviceService.registerDevice(user.getId(), request);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", "Thiết bị đã được đăng ký nhận thông báo");

        return ResponseEntity.ok(responseBody);
    }

    /**
     * DELETE /api/v1/notifications/unregister-device - Unregister device
     */
    @DeleteMapping("/unregister-device")
    public ResponseEntity<Map<String, Object>> unregisterDevice(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UnregisterDeviceRequest request
    ) {
        log.info("DELETE /api/v1/notifications/unregister-device - user: {}", user.getId());

        deviceService.unregisterDevice(user.getId(), request);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("message", "Thiết bị đã được hủy đăng ký");

        return ResponseEntity.ok(responseBody);
    }
}
