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
public class AdminBroadcastLogItem {
    private UUID id;
    private String title;
    private String body;
    private String targetAudience;
    private String priority;
    private String actionUrl;
    private String actionText;
    private int recipientCount;
    private String createdBy;
    private Instant createdAt;
}

