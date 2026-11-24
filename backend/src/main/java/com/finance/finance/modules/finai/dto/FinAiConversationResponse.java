package com.finance.finance.modules.finai.dto;
import lombok.*;
import java.time.Instant;
import java.util.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiConversationResponse {
    private UUID conversationId;
    private String title;
    private Instant createdAt;
    private Instant updatedAt;
    private List<Message> messages;
    private List<FinAiActionResponse> actions;
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Message {
        private UUID id;
        private String author;
        private String text;
        private String kind;
        private Instant createdAt;
        private List<UUID> actionIds;
        private List<FinAiActionResponse> actions;
    }
}

