package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private UUID id;
    private UUID groupId;
    private UUID senderId;
    private String messageType;
    private String content;
    private UUID replyToMessageId;
    private UUID expenseId;
    private List<UUID> mentionedUserIds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private SenderSummary sender;
    private ExpensePreview expensePreview;
    private List<AttachmentSummary> attachments;
    private Integer readByCount;
    private Boolean isReadByMe;
    private Boolean isEdited;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SenderSummary {
        private UUID id;
        private String fullName;
        private String displayName;
        private String avatarKey;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpensePreview {
        private String description;
        private BigDecimal amount;
        private String payer;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttachmentSummary {
        private UUID id;
        private String fileKey;
        private String fileName;
        private String mimeType;
        private Long fileSize;
        private String thumbnailKey;
    }
}
