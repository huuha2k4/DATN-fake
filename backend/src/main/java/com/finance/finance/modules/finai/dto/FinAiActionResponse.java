package com.finance.finance.modules.finai.dto;
import com.finance.finance.modules.finai.entity.FinAiActionStatus;
import lombok.*;
import java.time.Instant;
import java.util.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FinAiActionResponse {
    private UUID actionId;
    private UUID planId;
    private String toolName;
    private String title;
    private String description;
    private Map<String, Object> preview;
    private FinAiActionStatus status;
    private Instant expiresAt;
    private Instant confirmedAt;
    private Instant executedAt;
    private Object result;
    private String error;
}

