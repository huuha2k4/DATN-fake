package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityResponse {
    private UUID id;
    private UUID groupId;
    private String activityType;
    private UUID userId;
    private String description;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private UserSummary user;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private String fullName;
        private String avatarKey;
    }
}
