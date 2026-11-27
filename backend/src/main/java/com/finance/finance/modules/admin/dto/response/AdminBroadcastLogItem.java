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
    private String status;
    private Long expectedCount;
    private Long readCount;
    private boolean legacy;
    private UUID id;
    private String title;
    private String body;
    private String targetAudience;
    private String priority;
    private String actionUrl;
    private String actionText;
    private Long recipientCount;
    private String createdBy;
    private Instant createdAt;
}

