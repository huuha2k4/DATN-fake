package com.finance.finance.modules.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnreadCountResponse {

    @JsonProperty("unread_count")
    private Long unreadCount;

    @JsonProperty("by_priority")
    private Map<String, Long> byPriority;

    @JsonProperty("by_type")
    private Map<String, Long> byType;
}
