package com.finance.finance.modules.finai.dto;
import lombok.*;
import java.util.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiChatResponse {
    private String type;
    private UUID conversationId;
    private String message;
    private FinAiClarification clarification;
    @Singular("action")
    private List<FinAiActionResponse> actions;
}

