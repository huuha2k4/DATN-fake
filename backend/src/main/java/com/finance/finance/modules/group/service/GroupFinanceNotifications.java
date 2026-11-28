package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.notification.repository.NotificationRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** The caller holds the related finance record's lock during notification deduplication. */
@Component
@RequiredArgsConstructor
class GroupFinanceNotifications {
    private final NotificationService service;
    private final NotificationRepository notifications;
    private final GroupMemberRepository members;

    void send(UUID groupId, UUID userId, String tab, String target, UUID id, String event, String title, String message) {
        var member = members.findByGroupIdAndUserId(groupId, userId).orElse(null);
        if (member == null || !Boolean.TRUE.equals(member.getNotificationEnabled())
                || Boolean.TRUE.equals(member.getIsChildProfile())) return;
        String link = "/groups?groupId=" + groupId + "&tab=" + tab + "&" + target + "=" + id + "&event=" + event;
        if (notifications.existsByUserIdAndActionUrl(userId, link)) return;
        service.createNotification(userId, NotificationType.GROUP_FUND_DEPOSIT, NotificationPriority.NORMAL,
                title, message, link, "Mở tài chính nhóm");
    }
}
