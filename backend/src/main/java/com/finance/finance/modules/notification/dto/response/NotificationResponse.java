package com.finance.finance.modules.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {

    private UUID id;

    private NotificationType type;

    private NotificationPriority priority;

    private String title;

    private String body;

    @JsonProperty("icon_url")
    private String iconUrl;

    @JsonProperty("action_url")
    private String actionUrl;

    @JsonProperty("action_text")
    private String actionText;

    /**
     * Additional data as parsed JSON object
     */
    private Map<String, Object> data;

    @JsonProperty("is_read")
    private Boolean isRead;

    @JsonProperty("read_at")
    private LocalDateTime readAt;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
