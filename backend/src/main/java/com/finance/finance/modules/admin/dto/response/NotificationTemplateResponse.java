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
public class NotificationTemplateResponse {
    private UUID id;
    private String code;
    private String title;
    private String bodyTemplate;
    private String triggerEvent;
    private String scheduleCron;
    private String targetAudience;
    private String priority;
    private Boolean isActive;
    private Long totalDispatched;
    private Instant lastDispatchedAt;
    private Instant createdAt;
}

