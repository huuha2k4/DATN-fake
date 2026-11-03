package com.finance.finance.modules.ocr.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.ocr.dto.CreateTransactionFromOcrRequest;
import com.finance.finance.modules.ocr.dto.OcrReceiptResponse;
import com.finance.finance.modules.ocr.entity.Receipt;
import com.finance.finance.modules.ocr.repository.ReceiptRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    private final RestTemplate restTemplate;
    private final ReceiptRepository receiptRepository;
    private final TransactionService transactionService;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    @Value("${app.ai.ocr-service-url}")
    private String aiServiceUrl;

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of("image/jpeg", "image/png");
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10 MB

    /**
     * Scan a receipt image via the AI OCR service and persist the result.
     */
    @Transactional
    public OcrReceiptResponse scanReceipt(UUID userId, MultipartFile file) throws IOException {
        // --- Validate ---
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Chỉ chấp nhận file JPEG hoặc PNG");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Kích thước file vượt quá 10MB");
        }

        // --- Build multipart request to AI service ---
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        byte[] bytes = file.getBytes();
        ByteArrayResource fileResource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.jpg";
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        String url = aiServiceUrl + "/ocr/receipt?user_id=" + userId;
        log.info("Calling AI OCR service: {}", url);

        ResponseEntity<AiReceiptResult> aiResponse = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                AiReceiptResult.class
        );

        AiReceiptResult result = aiResponse.getBody();
        if (result == null) {
            throw new IllegalStateException("AI service returned empty response");
        }

        // --- Parse dates ---
        LocalDate txDate = null;
        if (result.getTransactionDate() != null && !result.getTransactionDate().isBlank()) {
            try {
                txDate = LocalDate.parse(result.getTransactionDate(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (Exception e) {
                log.warn("Could not parse transaction_date: {}", result.getTransactionDate());
            }
        }

        LocalTime txTime = null;
        if (result.getTransactionTime() != null && !result.getTransactionTime().isBlank()) {
            try {
                // Accept HH:mm or HH:mm:ss
                if (result.getTransactionTime().length() == 5) {
                    txTime = LocalTime.parse(result.getTransactionTime(), DateTimeFormatter.ofPattern("HH:mm"));
                } else {
                    txTime = LocalTime.parse(result.getTransactionTime(), DateTimeFormatter.ISO_LOCAL_TIME);
                }
            } catch (Exception e) {
                log.warn("Could not parse transaction_time: {}", result.getTransactionTime());
            }
        }

        // --- Build and save Receipt ---
        AiReceiptResult.AiCategory cat = result.getCategory();
        Receipt receipt = Receipt.builder()
                .userId(userId)
                .kind(result.getKind() != null ? result.getKind() : "unknown")
                .merchantName(result.getMerchantName())
                .transactionDate(txDate)
                .transactionTime(txTime)
                .totalAmount(result.getTotalAmount())
                .currency(result.getCurrency() != null ? result.getCurrency() : "VND")
                .rawText(result.getRawText())
                .confidence(result.getConfidence() != null
                        ? BigDecimal.valueOf(result.getConfidence()) : null)
                .needsReview(Boolean.TRUE.equals(result.getNeedsReview()))
                .aiCategoryId(cat != null ? cat.getCategory() : null)
                .aiCategoryName(cat != null ? cat.getCategoryName() : null)
                .aiCategoryConfidence(cat != null && cat.getConfidence() != null
                        ? BigDecimal.valueOf(cat.getConfidence()) : null)
                .aiCategorySource(cat != null ? cat.getSource() : null)
                .build();

        receipt = receiptRepository.save(receipt);
        log.info("Saved receipt id={} for user={}", receipt.getId(), userId);

        return toResponse(receipt);
    }

    /**
     * Create a transaction from an existing OCR receipt.
     */
    @Transactional
    public TransactionResponse createTransactionFromOcr(UUID userId, CreateTransactionFromOcrRequest req) {
        Receipt receipt = receiptRepository.findByIdAndUserId(req.getReceiptId(), userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy receipt: " + req.getReceiptId()));

        LocalDate txDate = receipt.getTransactionDate() != null
                ? receipt.getTransactionDate()
                : LocalDate.now();

        // Resolve categoryId: explicit request > AI suggestion
        UUID categoryId = req.getCategoryId();
        if (categoryId == null && receipt.getAiCategoryId() != null) {
            // AI category ID is a string key (e.g. "food"), not a UUID — skip fallback
            // unless it can be parsed as UUID
            try {
                categoryId = UUID.fromString(receipt.getAiCategoryId());
            } catch (IllegalArgumentException ignored) {
                // String category id, not a UUID — cannot map to system category
            }
        }

        // Use user-supplied override if provided, otherwise fall back to OCR value
        BigDecimal amount;
        if (req.getOverrideAmount() != null && req.getOverrideAmount().compareTo(BigDecimal.ZERO) > 0) {
            amount = req.getOverrideAmount();
        } else {
            amount = receipt.getTotalAmount() != null
                    ? BigDecimal.valueOf(receipt.getTotalAmount())
                    : BigDecimal.ONE;
        }

        String currencyCode = receipt.getCurrency() != null ? receipt.getCurrency() : "VND";
        // Ensure currencyCode is exactly 3 chars uppercase
        if (currencyCode.length() > 3) {
            currencyCode = currencyCode.substring(0, 3).toUpperCase();
        } else {
            currencyCode = currencyCode.toUpperCase();
        }

        CreateTransactionRequest txReq = CreateTransactionRequest.builder()
                .transactionType(TransactionType.EXPENSE)
                .accountId(req.getAccountId())
                .amount(amount)
                .currencyCode(currencyCode)
                .transactionDate(txDate)
                .transactionTime(receipt.getTransactionTime())
                .categoryId(categoryId)
                .description(req.getDescription())
                .note(req.getNote())
                .build();

        TransactionResponse txResponse = transactionService.createTransaction(userId, txReq);

        // Link receipt to the new transaction
        receipt.setTransactionId(txResponse.getId());
        receiptRepository.save(receipt);

        return txResponse;
    }

    /**
     * List receipts for a user with pagination.
     */
    public Page<OcrReceiptResponse> getReceipts(UUID userId, Pageable pageable) {
        return receiptRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    /**
     * Delete a receipt.
     */
    @Transactional
    public void deleteReceipt(UUID userId, UUID receiptId) {
        Receipt receipt = receiptRepository.findByIdAndUserId(receiptId, userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy receipt: " + receiptId));
        receiptRepository.delete(receipt);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private OcrReceiptResponse toResponse(Receipt r) {
        return OcrReceiptResponse.builder()
                .id(r.getId())
                .kind(r.getKind())
                .merchantName(r.getMerchantName())
                .transactionDate(r.getTransactionDate())
                .transactionTime(r.getTransactionTime())
                .totalAmount(r.getTotalAmount())
                .currency(r.getCurrency())
                .confidence(r.getConfidence() != null ? r.getConfidence().doubleValue() : null)
                .needsReview(r.getNeedsReview())
                .aiCategoryId(r.getAiCategoryId())
                .aiCategoryName(r.getAiCategoryName())
                .aiCategoryConfidence(r.getAiCategoryConfidence() != null
                        ? r.getAiCategoryConfidence().doubleValue() : null)
                .transactionId(r.getTransactionId())
                .build();
    }

    // -----------------------------------------------------------------------
    // Inner POJO for deserializing AI service response
    // -----------------------------------------------------------------------

    @Data
    public static class AiReceiptResult {

        @JsonProperty("kind")
        private String kind;

        @JsonProperty("merchant_name")
        private String merchantName;

        @JsonProperty("transaction_date")
        private String transactionDate;

        @JsonProperty("transaction_time")
        private String transactionTime;

        @JsonProperty("total_amount")
        private Long totalAmount;

        @JsonProperty("currency")
        private String currency;

        @JsonProperty("raw_text")
        private String rawText;

        @JsonProperty("confidence")
        private Double confidence;

        @JsonProperty("needs_review")
        private Boolean needsReview;

        @JsonProperty("category")
        private AiCategory category;

        @Data
        public static class AiCategory {

            @JsonProperty("category")
            private String category;

            @JsonProperty("category_name")
            private String categoryName;

            @JsonProperty("confidence")
            private Double confidence;

            @JsonProperty("source")
            private String source;

            @JsonProperty("status")
            private String status;

            @JsonProperty("needs_review")
            private Boolean needsReview;
        }
    }
}
