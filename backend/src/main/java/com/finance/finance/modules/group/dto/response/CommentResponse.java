package com.finance.finance.modules.group.dto.response;

import com.finance.finance.common.enums.CommentableType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentResponse {
    private UUID id;
    private UUID groupId;
    private CommentableType commentableType;
    private UUID commentableId;
    private UUID userId;
    private String content;
    private UUID parentCommentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserSummary user;
    private Integer replyCount;
    private List<CommentResponse> replies;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSummary {
        private UUID id;
        private String fullName;
        private String displayName;
        private String avatarKey;
    }
}
