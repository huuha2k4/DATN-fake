package com.finance.finance.modules.finai.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;
@Data
public class FinAiChatRequest {
    private UUID conversationId;
    @NotBlank @Size(max = 4000)
    private String message;
}

