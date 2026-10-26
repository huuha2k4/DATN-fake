package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarkMessagesReadRequest {
    @NotEmpty(message = "Danh sách message IDs không được để trống")
    private List<UUID> messageIds;
}
