package com.finance.finance.modules.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarkReadResponse {

    private UUID id;

    @JsonProperty("is_read")
    private Boolean isRead;

    @JsonProperty("read_at")
    private LocalDateTime readAt;
}
