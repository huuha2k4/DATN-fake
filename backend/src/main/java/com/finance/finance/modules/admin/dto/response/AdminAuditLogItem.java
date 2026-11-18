package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogItem {
    private UUID id;
    private String adminUsername;
    private String adminFullName;
    private String action;        // USER_LOCK, USER_UNLOCK, USER_UPDATE, CATEGORY_CREATE, CATEGORY_UPDATE, CATEGORY_DELETE, BROADCAST_SEND, FEEDBACK_REPLY, SETTINGS_UPDATE
    private String targetEntity;  // USER, CATEGORY, NOTIFICATION, FEEDBACK, SYSTEM
    private String targetId;
    private String description;
    private String ipAddress;
    private String status;        // SUCCESS, FAILED
    private Instant createdAt;
}

