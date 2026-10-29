package com.finance.finance.modules.ocr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrReceiptResponse {

    private UUID id;
    private String kind;
    private String merchantName;
    private LocalDate transactionDate;
    private LocalTime transactionTime;
    private Long totalAmount;
    private String currency;
    private Double confidence;
    private Boolean needsReview;
    private String aiCategoryId;
    private String aiCategoryName;
    private Double aiCategoryConfidence;
    private UUID transactionId;
}
