package com.finance.finance.modules.notification.service;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.modules.notification.dto.response.*;
import com.finance.finance.modules.notification.entity.Notification;
import com.finance.finance.modules.notification.exception.NotificationNotFoundException;
import com.finance.finance.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Create and save a notification
     */
    @Transactional
    public Notification createNotification(
            UUID userId,
            NotificationType type,
            NotificationPriority priority,
            String title,
            String body,
            String actionUrl,
            String actionText
    ) {
        log.info("Creating notification for user: {}, type: {}, title: {}", userId, type, title);
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .priority(priority != null ? priority : NotificationPriority.NORMAL)
                .title(title)
                .body(body)
                .actionUrl(actionUrl)
                .actionText(actionText)
                .isRead(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Get notifications with filters and pagination
     */
    @Transactional(readOnly = true)
    public NotificationListResponse listNotifications(
            UUID userId,
            Boolean isRead,
            NotificationType type,
            NotificationPriority priority,
            int page,
            int pageSize
    ) {
        log.info("Listing notifications for user: {}, isRead: {}, type: {}, priority: {}", 
                userId, isRead, type, priority);

        Pageable pageable = PageRequest.of(page - 1, pageSize);
        Page<Notification> notificationsPage = notificationRepository.findByUserIdWithFilters(
                userId, isRead, type, priority, pageable
        );

        List<NotificationResponse> notifications = notificationsPage.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        long unreadCount = notificationRepository.countUnreadByUserId(userId);

        return NotificationListResponse.builder()
                .notifications(notifications)
                .unreadCount(unreadCount)
                .build();
    }

    /**
     * Get unread count with breakdown by priority and type
     */
    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(UUID userId) {
        log.info("Getting unread count for user: {}", userId);

        long totalUnread = notificationRepository.countUnreadByUserId(userId);

        // Count by priority
        Map<String, Long> byPriority = new HashMap<>();
        for (NotificationPriority priority : NotificationPriority.values()) {
            long count = notificationRepository.countUnreadByUserIdAndPriority(userId, priority);
            byPriority.put(priority.name().toLowerCase(), count);
        }

        // Count by type (only include types with count > 0)
        Map<String, Long> byType = new HashMap<>();
        for (NotificationType type : NotificationType.values()) {
            long count = notificationRepository.countUnreadByUserIdAndType(userId, type);
            if (count > 0) {
                byType.put(type.name(), count);
            }
        }

        return UnreadCountResponse.builder()
                .unreadCount(totalUnread)
                .byPriority(byPriority)
                .byType(byType)
                .build();
    }

    /**
     * Mark a notification as read
     */
    @Transactional
    public MarkReadResponse markAsRead(UUID userId, UUID notificationId) {
        log.info("Marking notification as read: {}, user: {}", notificationId, userId);

        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException("Không tìm thấy thông báo"));

        if (notification.getIsRead()) {
            log.debug("Notification already read: {}", notificationId);
        } else {
            notification.markAsRead();
            notificationRepository.save(notification);
        }

        return MarkReadResponse.builder()
                .id(notification.getId())
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .build();
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public BulkActionResponse markAllAsRead(UUID userId) {
        log.info("Marking all notifications as read for user: {}", userId);

        int markedCount = notificationRepository.markAllAsReadByUserId(userId);

        log.info("Marked {} notifications as read", markedCount);

        return BulkActionResponse.builder()
                .markedCount(markedCount)
                .build();
    }

    /**
     * Delete a notification (soft delete)
     */
    @Transactional
    public void deleteNotification(UUID userId, UUID notificationId) {
        log.info("Deleting notification: {}, user: {}", notificationId, userId);

        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException("Không tìm thấy thông báo"));

        notification.delete();
        notificationRepository.save(notification);

        log.info("Notification deleted: {}", notificationId);
    }

    /**
     * Clear all read notifications (soft delete)
     */
    @Transactional
    public BulkActionResponse clearAllRead(UUID userId) {
        log.info("Clearing all read notifications for user: {}", userId);

        int deletedCount = notificationRepository.deleteAllReadByUserId(userId);

        log.info("Cleared {} read notifications", deletedCount);

        return BulkActionResponse.builder()
                .deletedCount(deletedCount)
                .build();
    }

    /**
     * Convert Notification entity to NotificationResponse DTO
     */
    private NotificationResponse toResponse(Notification notification) {
        // For now, keep data as null
        // TODO: Parse JSON data when needed
        Map<String, Object> dataMap = null;

        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .priority(notification.getPriority())
                .title(notification.getTitle())
                .body(notification.getBody())
                .iconUrl(notification.getIconUrl())
                .actionUrl(notification.getActionUrl())
                .actionText(notification.getActionText())
                .data(dataMap)
                .isRead(notification.getIsRead())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
