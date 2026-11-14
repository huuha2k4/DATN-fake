package com.finance.finance.modules.notification.service;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.notification.dto.request.UpdateNotificationSettingsRequest;
import com.finance.finance.modules.notification.dto.response.*;
import com.finance.finance.modules.notification.entity.Notification;
import com.finance.finance.modules.notification.entity.UserNotificationSetting;
import com.finance.finance.modules.notification.exception.NotificationNotFoundException;
import com.finance.finance.modules.notification.repository.NotificationRepository;
import com.finance.finance.modules.notification.repository.UserNotificationSettingRepository;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserNotificationSettingRepository userNotificationSettingRepository;
    private final TransactionRepository transactionRepository;

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Locale LOCALE_VN = new Locale("vi", "VN");

    /**
     * Get or create default notification settings for user
     */
    @Transactional
    public NotificationSettingsResponse getNotificationSettings(UUID userId) {
        log.info("Getting notification settings for user: {}", userId);
        return userNotificationSettingRepository.findByUserId(userId)
                .map(NotificationSettingsResponse::fromEntity)
                .orElseGet(() -> {
                    UserNotificationSetting initial = UserNotificationSetting.builder()
                            .userId(userId)
                            .build();
                    return NotificationSettingsResponse.fromEntity(userNotificationSettingRepository.save(initial));
                });
    }

    /**
     * Update notification settings for user
     */
    @Transactional
    public NotificationSettingsResponse updateNotificationSettings(UUID userId, UpdateNotificationSettingsRequest request) {
        log.info("Updating notification settings for user: {}", userId);
        UserNotificationSetting setting = userNotificationSettingRepository.findByUserId(userId)
                .orElseGet(() -> UserNotificationSetting.builder().userId(userId).build());

        if (request.getRemindersEnabled() != null) setting.setRemindersEnabled(request.getRemindersEnabled());
        if (request.getDebtDueReminder() != null) setting.setDebtDueReminder(request.getDebtDueReminder());
        if (request.getScheduleDueReminder() != null) setting.setScheduleDueReminder(request.getScheduleDueReminder());
        if (request.getRemindAdvanceDays() != null) setting.setRemindAdvanceDays(request.getRemindAdvanceDays());

        if (request.getBudgetAlertEnabled() != null) setting.setBudgetAlertEnabled(request.getBudgetAlertEnabled());
        if (request.getBudgetThreshold80() != null) setting.setBudgetThreshold80(request.getBudgetThreshold80());
        if (request.getBudgetThreshold100() != null) setting.setBudgetThreshold100(request.getBudgetThreshold100());
        if (request.getBalanceForecastAlert() != null) setting.setBalanceForecastAlert(request.getBalanceForecastAlert());

        if (request.getTransactionSuccessNotify() != null) setting.setTransactionSuccessNotify(request.getTransactionSuccessNotify());
        if (request.getGroupExpenseNotify() != null) setting.setGroupExpenseNotify(request.getGroupExpenseNotify());

        if (request.getWeeklyReportNotify() != null) setting.setWeeklyReportNotify(request.getWeeklyReportNotify());
        if (request.getMonthlyReportNotify() != null) setting.setMonthlyReportNotify(request.getMonthlyReportNotify());

        if (request.getSoundEnabled() != null) setting.setSoundEnabled(request.getSoundEnabled());
        if (request.getVibrateEnabled() != null) setting.setVibrateEnabled(request.getVibrateEnabled());

        UserNotificationSetting saved = userNotificationSettingRepository.save(setting);
        return NotificationSettingsResponse.fromEntity(saved);
    }

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
    @Transactional
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

        // Đảm bảo thông báo Báo cáo tài chính tuần của tuần trước luôn được khởi tạo/cập nhật theo đúng dữ liệu giao dịch thật
        ensureWeeklyFinancialReportNotification(userId);

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
     * Tự động tính toán dữ liệu chi tiêu thực tế của Tuần trước (Thứ 2 -> Chủ nhật)
     * và đối chiếu % tăng/giảm so với tuần liền kề trước đó để tạo/cập nhật thông báo Báo cáo tài chính tuần.
     */
    @Transactional
    public void ensureWeeklyFinancialReportNotification(UUID userId) {
        try {
            UserNotificationSetting setting = userNotificationSettingRepository.findByUserId(userId).orElse(null);
            if (setting != null && Boolean.FALSE.equals(setting.getWeeklyReportNotify())) {
                return;
            }

            LocalDate today = LocalDate.now(ZONE_VN);
            LocalDate thisWeekMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate lastWeekMonday = thisWeekMonday.minusWeeks(1);
            LocalDate lastWeekSunday = thisWeekMonday.minusDays(1);
            LocalDate twoWeeksAgoMonday = lastWeekMonday.minusWeeks(1);
            LocalDate twoWeeksAgoSunday = lastWeekMonday.minusDays(1);

            String actionUrl = String.format("/reports?period=last_week&from=%s&to=%s", lastWeekMonday, lastWeekSunday);
            String dataJson = String.format("{\"periodPreset\":\"LAST_WEEK\",\"fromDate\":\"%s\",\"toDate\":\"%s\"}", lastWeekMonday, lastWeekSunday);
            String title = "📊 Báo cáo tài chính tuần của bạn đã sẵn sàng!";

            // Tính tổng chi tiêu thực tế từ bảng transactions của user
            Page<Transaction> twoWeeksTxsPage = transactionRepository.findByUserIdAndDateRange(
                    userId, twoWeeksAgoMonday, lastWeekSunday, PageRequest.of(0, 2000)
            );
            List<Transaction> userExpenses = twoWeeksTxsPage.getContent().stream()
                    .filter(t -> t.getDeletedAt() == null
                            && !t.isExcludedFromReport()
                            && t.getType() == TransactionType.EXPENSE
                            && t.getOccurredDate() != null)
                    .toList();

            BigDecimal lastWeekSpent = userExpenses.stream()
                    .filter(t -> !t.getOccurredDate().isBefore(lastWeekMonday) && !t.getOccurredDate().isAfter(lastWeekSunday))
                    .map(t -> t.getBaseAmount() != null ? t.getBaseAmount() : (t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal prevWeekSpent = userExpenses.stream()
                    .filter(t -> !t.getOccurredDate().isBefore(twoWeeksAgoMonday) && !t.getOccurredDate().isAfter(twoWeeksAgoSunday))
                    .map(t -> t.getBaseAmount() != null ? t.getBaseAmount() : (t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            NumberFormat vndFormat = NumberFormat.getInstance(LOCALE_VN);
            vndFormat.setMaximumFractionDigits(0);
            String formattedSpent = vndFormat.format(lastWeekSpent.setScale(0, RoundingMode.HALF_UP)) + "đ";

            String comparisonText;
            if (prevWeekSpent.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal diff = lastWeekSpent.subtract(prevWeekSpent);
                int pct = diff.abs()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(prevWeekSpent, 0, RoundingMode.HALF_UP)
                        .intValue();
                if (diff.compareTo(BigDecimal.ZERO) < 0) {
                    comparisonText = String.format(", giảm %d%% so với tuần trước", pct);
                } else if (diff.compareTo(BigDecimal.ZERO) > 0) {
                    comparisonText = String.format(", tăng %d%% so với tuần trước", pct);
                } else {
                    comparisonText = ", giữ nguyên mức chi so với tuần trước";
                }
            } else if (lastWeekSpent.compareTo(BigDecimal.ZERO) > 0) {
                comparisonText = " trong tuần vừa qua";
            } else {
                comparisonText = " (tuần qua chưa phát sinh khoản chi tiêu nào)";
            }

            String body = String.format("Tuần qua bạn đã chi %s%s. Xem ngay báo cáo nhé!", formattedSpent, comparisonText);

            // Kiểm tra xem đã có thông báo WEEKLY_SUMMARY của kỳ tuần trước này chưa
            Page<Notification> existingWeeklyPage = notificationRepository.findByUserIdWithFilters(
                    userId, null, NotificationType.WEEKLY_SUMMARY, null, PageRequest.of(0, 10)
            );
            Notification existingForThisWeek = existingWeeklyPage.getContent().stream()
                    .filter(n -> actionUrl.equals(n.getActionUrl()))
                    .findFirst()
                    .orElse(null);

            if (existingForThisWeek != null) {
                // Cập nhật lại nội dung nếu số liệu giao dịch tuần trước có thay đổi
                if (!body.equals(existingForThisWeek.getBody()) || !title.equals(existingForThisWeek.getTitle())) {
                    existingForThisWeek.setTitle(title);
                    existingForThisWeek.setBody(body);
                    existingForThisWeek.setData(dataJson);
                    existingForThisWeek.setActionText("Xem ngay");
                    notificationRepository.save(existingForThisWeek);
                }
            } else {
                Notification newWeeklyNotif = Notification.builder()
                        .userId(userId)
                        .type(NotificationType.WEEKLY_SUMMARY)
                        .priority(NotificationPriority.NORMAL)
                        .title(title)
                        .body(body)
                        .actionUrl(actionUrl)
                        .actionText("Xem ngay")
                        .data(dataJson)
                        .isRead(false)
                        .build();
                notificationRepository.save(newWeeklyNotif);
            }
        } catch (Exception e) {
            log.warn("Không thể tự động đồng bộ thông báo báo cáo tuần cho user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Convert Notification entity to NotificationResponse DTO
     */
    private NotificationResponse toResponse(Notification notification) {
        Map<String, Object> dataMap = parseSimpleJsonData(notification.getData());

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

    private Map<String, Object> parseSimpleJsonData(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        String content = trimmed.substring(1, trimmed.length() - 1).trim();
        if (content.isEmpty()) {
            return map;
        }
        for (String pair : content.split(",")) {
            int colonIdx = pair.indexOf(':');
            if (colonIdx > 0) {
                String key = pair.substring(0, colonIdx).trim().replace("\"", "");
                String val = pair.substring(colonIdx + 1).trim().replace("\"", "");
                if (!key.isEmpty()) {
                    map.put(key, val);
                }
            }
        }
        return map.isEmpty() ? null : map;
    }
}
