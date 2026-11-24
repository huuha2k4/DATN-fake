package com.finance.finance.modules.finai.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiConversationSummaryResponse {
    private UUID conversationId;
    private String title;
    private Instant createdAt;
    private Instant updatedAt;
}
