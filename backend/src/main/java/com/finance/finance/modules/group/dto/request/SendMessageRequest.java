package com.finance.finance.modules.group.dto.request;

import com.finance.finance.common.enums.MessageType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    @NotNull(message = "Loại tin nhắn không được để trống")
    private MessageType messageType; // TEXT, IMAGE, EXPENSE_CARD, SYSTEM

    private String content;

    private UUID replyToMessageId;
    
    private UUID expenseId; // For EXPENSE_CARD type

    private List<UUID> mentionedUserIds;

    @Valid
    private List<MessageAttachmentDto> attachments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageAttachmentDto {
        @NotNull(message = "File key không được để trống")
        private String fileKey;

        private String fileName;
        private String mimeType;
        private Long fileSize;
        private String thumbnailKey;
    }
}
