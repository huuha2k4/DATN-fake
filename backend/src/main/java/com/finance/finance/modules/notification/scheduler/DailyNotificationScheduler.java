package com.finance.finance.modules.notification.scheduler;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.modules.admin.entity.NotificationTemplate;
import com.finance.finance.modules.admin.repository.NotificationTemplateRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.notification.entity.Notification;
import com.finance.finance.modules.notification.repository.NotificationRepository;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DailyNotificationScheduler {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository notificationTemplateRepository;

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * Chạy định kỳ vào đúng 20:00 mỗi tối theo giờ Việt Nam
     * Kiểm tra xem trong ngày hôm nay người dùng đã có giao dịch nào chưa.
     * Nếu chưa có bất kỳ giao dịch thu/chi nào, hệ thống tự động bắn chuông thông báo nhắc nhở!
     */
    @Scheduled(cron = "0 0 20 * * ?", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void checkAndSendDailyExpenseReminder() {
        log.info("[Scheduler] Bắt đầu quét kiểm tra chi tiêu người dùng lúc 20:00...");

        // 1. Kiểm tra xem mẫu thông báo có đang được Bật (is_active = true) hay không
        NotificationTemplate template = notificationTemplateRepository.findAll().stream()
                .filter(t -> "AUTO_DAILY_20PM_NO_TX".equalsIgnoreCase(t.getCode()) || "DAILY_NO_EXPENSE_CHECK".equalsIgnoreCase(t.getTriggerEvent()))
                .findFirst()
                .orElse(null);

        if (template != null && Boolean.FALSE.equals(template.getIsActive())) {
            log.info("[Scheduler] Mẫu thông báo nhắc nhở 20:00 đang bị Tắt bởi Admin. Bỏ qua lượt chạy.");
            return;
        }

        LocalDate today = LocalDate.now(ZONE_VN);

        // 2. Lấy danh sách tất cả người dùng ACTIVE
        List<User> activeUsers = userRepository.findAll().stream()
                .filter(u -> u.getDeletedAt() == null && u.getUserStatus() == UserStatus.ACTIVE)
                .toList();

        if (activeUsers.isEmpty()) {
            return;
        }

        // 3. Lấy tất cả giao dịch phát sinh trong ngày hôm nay
        List<Transaction> todayTransactions = transactionRepository.findAll().stream()
                .filter(t -> t.getDeletedAt() == null && today.equals(t.getOccurredDate()))
                .toList();

        // Tập hợp ID của những người ĐÃ có giao dịch hôm nay
        Set<UUID> usersWithTxToday = todayTransactions.stream()
                .map(Transaction::getUserId)
                .collect(Collectors.toSet());

        // 4. Lọc ra những người dùng CHƯA có bất kỳ giao dịch nào hôm nay
        List<User> usersWithoutTx = activeUsers.stream()
                .filter(u -> !usersWithTxToday.contains(u.getId()))
                .toList();

        if (usersWithoutTx.isEmpty()) {
            log.info("[Scheduler] Tuyệt vời! Tất cả người dùng hôm nay đều đã ghi nhận giao dịch.");
            return;
        }

        String title = template != null ? template.getTitle() : "Hôm nay bạn chưa ghi nhận chi tiêu nào? 📝";
        String bodyTemplate = template != null ? template.getBodyTemplate() : "Chào {user_name}, đã 20:00 rồi! Hôm nay bạn có khoản chi tiêu nào chưa kịp ghi chép không? Hãy dành 1 phút để cập nhật nhé.";

        List<Notification> notificationsToSend = new ArrayList<>();

        for (User u : usersWithoutTx) {
            String personalizedBody = bodyTemplate.replace("{user_name}", u.getFullName() != null ? u.getFullName() : "bạn");

            notificationsToSend.add(Notification.builder()
                    .userId(u.getId())
                    .type(NotificationType.SYSTEM)
                    .priority(NotificationPriority.NORMAL)
                    .title(title)
                    .body(personalizedBody)
                    .actionUrl("/add-transaction")
                    .actionText("Thêm giao dịch ngay")
                    .isRead(false)
                    .build());
        }

        notificationRepository.saveAll(notificationsToSend);

        // Cập nhật số lượt đã gửi & thời gian gửi gần nhất vào template
        if (template != null) {
            template.setTotalDispatched(template.getTotalDispatched() + notificationsToSend.size());
            template.setLastDispatchedAt(Instant.now());
            notificationTemplateRepository.save(template);
        }

        log.info("[Scheduler] Đã gửi thông báo nhắc nhở 20:00 thành công tới {} tài khoản chưa có giao dịch hôm nay.", notificationsToSend.size());
    }
}
