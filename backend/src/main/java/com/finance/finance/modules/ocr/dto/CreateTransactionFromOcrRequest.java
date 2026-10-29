package com.finance.finance.modules.ocr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTransactionFromOcrRequest {

    @NotNull(message = "Receipt ID is required")
    private UUID receiptId;

    @NotNull(message = "Account ID is required")
    private UUID accountId;

    private UUID categoryId;

    private String description;

    private String note;
}
