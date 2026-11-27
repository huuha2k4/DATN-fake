package com.finance.finance.modules.ocr.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.model.AuditSource;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.ocr.dto.CreateTransactionFromOcrRequest;
import com.finance.finance.modules.ocr.dto.OcrReceiptResponse;
import com.finance.finance.modules.ocr.entity.Receipt;
import com.finance.finance.modules.ocr.repository.ReceiptRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.common.upload.FileUploadValidator;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
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
    private final FileUploadValidator fileUploadValidator;
    private final PlatformTransactionManager transactionManager;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.common.upload.AttachmentUrlSigner attachmentUrlSigner;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemAuditService systemAuditService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.user.repository.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.notification.repository.NotificationRepository notificationRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.notification.service.NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.admin.repository.NotificationTemplateRepository notificationTemplateRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.finance.finance.modules.admin.service.SystemConfigService systemConfigService;

    @Value("${app.ai.ocr-service-url}")
    private String aiServiceUrl;

    private static final String RECEIPT_UPLOAD_DIR = "uploads/receipts";

    // Các kind bị từ chối — không lưu DB, trả thẳng về frontend
    private static final Set<String> REJECTED_KINDS = Set.of(
            "not_receipt", "low_quality", "handwritten", "draft"
    );

    /**
     * Scan a receipt image via the AI OCR service and persist the result.
     */
    public OcrReceiptResponse scanReceipt(UUID userId, MultipartFile file) throws IOException {
        FileUploadValidator.ValidatedUpload validated;
        try {
            validated = fileUploadValidator.validate(file, FileUploadValidator.Policy.RECEIPT);
        } catch (IllegalArgumentException error) {
            com.finance.finance.modules.admin.monitoring.RequestObservation.error(
                    file.getSize() > 10L * 1024 * 1024 ? "FILE_TOO_LARGE" : "INVALID_IMAGE");
            throw error;
        }

        // --- Save receipt image to uploads/receipts ---
        String imageUrl = null;
        try {
            Path uploadDir = Paths.get(RECEIPT_UPLOAD_DIR);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String filename = UUID.randomUUID() + validated.extension();
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            imageUrl = "/" + RECEIPT_UPLOAD_DIR + "/" + filename;
            log.info("Saved receipt image to {}", imageUrl);
        } catch (Exception e) {
            log.warn("Could not save receipt image to disk: {}", e.getMessage());
        }

        // --- Build multipart request to AI service ---
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        String requestId = com.finance.finance.modules.admin.monitoring.RequestObservation.requestId();
        if (requestId != null) headers.set("X-Request-Id", requestId);

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

        long engineStarted = System.nanoTime();
        ResponseEntity<AiReceiptResult> aiResponse;
        try {
            aiResponse = restTemplate.exchange(
                url,
                HttpMethod.POST,
                requestEntity,
                AiReceiptResult.class
            );
        } catch (org.springframework.web.client.ResourceAccessException error) {
            String code = "OCR_SERVICE_UNAVAILABLE";
            for (Throwable cause = error; cause != null; cause = cause.getCause()) {
                if (cause instanceof java.net.SocketTimeoutException) {
                    code = "OCR_TIMEOUT";
                    break;
                }
            }
            com.finance.finance.modules.admin.monitoring.RequestObservation.error(code);
            com.finance.finance.modules.admin.monitoring.RequestObservation.ocrEngine(null, engineStarted);
            throw error;
        } catch (org.springframework.web.client.RestClientResponseException error) {
            int upstream = error.getStatusCode().value();
            String code = switch (upstream) {
                case 400, 415, 422 -> "INVALID_IMAGE";
                case 413 -> "FILE_TOO_LARGE";
                case 503 -> "OCR_SERVICE_UNAVAILABLE";
                case 504 -> "OCR_TIMEOUT";
                default -> "OCR_PROCESSING_ERROR";
            };
            com.finance.finance.modules.admin.monitoring.RequestObservation.error(code);
            com.finance.finance.modules.admin.monitoring.RequestObservation.ocrEngine(null, engineStarted);
            throw error;
        }

        AiReceiptResult result = aiResponse.getBody();
        com.finance.finance.modules.admin.monitoring.RequestObservation.ocrEngine(
                result == null ? null : result.getEngine(), engineStarted);
        if (result == null) {
            throw new IllegalStateException("AI service returned empty response");
        }

        // --- CỔNG KIỂM TRA: từ chối ảnh không hợp lệ, không lưu DB ---
        if (result.getKind() != null && REJECTED_KINDS.contains(result.getKind())) {
            com.finance.finance.modules.admin.monitoring.RequestObservation.error("OCR_REJECTED_IMAGE");
            com.finance.finance.modules.admin.monitoring.RequestObservation.ocrResult(
                    result.getConfidence(), result.getNeedsReview(), false);
            log.info("Receipt rejected by AI service: kind={}, reason={}", result.getKind(), result.getRejectReason());
            // Xóa ảnh đã lưu tạm (nếu có) vì không cần thiết
            if (imageUrl != null) {
                try {
                    Files.deleteIfExists(Paths.get(imageUrl.replaceFirst("^/", "")));
                } catch (Exception ignored) {}
            }
            // Trả về response từ chối mà KHÔNG lưu vào database
            return OcrReceiptResponse.builder()
                    .kind(result.getKind())
                    .confidence(result.getConfidence())
                    .needsReview(result.getNeedsReview() != null ? result.getNeedsReview() : false)
                    .rejectReason(result.getRejectReason())
                    .build();
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
                .imageUrl(imageUrl)
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

        OcrReceiptResponse response = new TransactionTemplate(transactionManager).execute(transaction ->
                toResponse(receiptRepository.save(receipt)));
        checkAndSendOcrLimitWarning(userId);
        com.finance.finance.modules.admin.monitoring.RequestObservation.ocrResult(
                result.getConfidence(), result.getNeedsReview(), true);
        return response;
    }

    private void checkAndSendOcrLimitWarning(UUID userId) {
        if (userRepository == null || notificationService == null || notificationRepository == null) {
            return;
        }
        try {
            var user = userRepository.findActiveUserById(userId).orElse(null);
            if (user == null || user.getSubscriptionTier() != com.finance.finance.common.enums.SubscriptionTier.FREE) {
                return;
            }
            var template = notificationTemplateRepository != null
                    ? notificationTemplateRepository.lockByCode("AUTO_OCR_LIMIT_WARNING").orElse(null)
                    : null;
            if (template != null && Boolean.FALSE.equals(template.getIsActive())) {
                return;
            }

            long limit = systemConfigService != null
                    ? systemConfigService.getLong("FREE_TIER_OCR_LIMIT", 10L)
                    : 10L;
            if (limit <= 0) {
                return;
            }

            java.time.ZoneId zoneVn = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
            java.time.LocalDateTime monthStartLocal = java.time.LocalDate.now(zoneVn)
                    .withDayOfMonth(1)
                    .atStartOfDay();
            java.time.Instant monthStartInstant = monthStartLocal.atZone(zoneVn).toInstant();

            long usedCount = receiptRepository.countByUserIdAndCreatedAtAfter(userId, monthStartInstant);
            long warnThreshold = Math.max(1L, limit - 2L);
            if (usedCount < warnThreshold) {
                return;
            }
            if (notificationRepository.existsByUserIdAndActionUrlAndCreatedAtAfter(userId, "/pricing", monthStartLocal)) {
                return;
            }

            String userName = user.getFullName() != null && !user.getFullName().isBlank()
                    ? user.getFullName()
                    : (user.getUsername() != null ? user.getUsername() : "bạn");
            String titleTemplate = template != null && template.getTitle() != null
                    ? template.getTitle()
                    : "Cảnh báo hạn mức quét hóa đơn OCR 🧾";
            String bodyTemplate = template != null && template.getBodyTemplate() != null
                    ? template.getBodyTemplate()
                    : "Chào {user_name}, bạn đã sử dụng gần hết lượt quét hóa đơn OCR miễn phí trong tháng. Nâng cấp VIP để không giới hạn lượt quét nhé!";

            String title = titleTemplate
                    .replace("{user_name}", userName)
                    .replace("{used_count}", String.valueOf(usedCount))
                    .replace("{limit_count}", String.valueOf(limit));
            String body = bodyTemplate
                    .replace("{user_name}", userName)
                    .replace("{used_count}", String.valueOf(usedCount))
                    .replace("{limit_count}", String.valueOf(limit));

            com.finance.finance.common.enums.NotificationPriority priority =
                    com.finance.finance.common.enums.NotificationPriority.HIGH;
            if (template != null && template.getPriority() != null) {
                try {
                    priority = com.finance.finance.common.enums.NotificationPriority.valueOf(
                            template.getPriority().trim().toUpperCase(java.util.Locale.ROOT));
                } catch (IllegalArgumentException ignored) {}
            }

            notificationService.createNotification(
                    userId,
                    com.finance.finance.common.enums.NotificationType.SYSTEM,
                    priority,
                    title,
                    body,
                    "/pricing",
                    "Nâng cấp VIP"
            );

            if (template != null && notificationTemplateRepository != null) {
                template.setTotalDispatched((template.getTotalDispatched() != null ? template.getTotalDispatched() : 0L) + 1L);
                template.setLastDispatchedAt(java.time.Instant.now());
                notificationTemplateRepository.save(template);
            }
        } catch (Exception ex) {
            log.warn("Failed to evaluate OCR limit warning for user {}: {}", userId, ex.getMessage());
        }
    }

    /**
     * Create a transaction from an existing OCR receipt.
     */
    @Transactional
    public TransactionResponse createTransactionFromOcr(UUID userId, CreateTransactionFromOcrRequest req) {
        Receipt receipt = receiptRepository.findByIdAndUserId(req.getReceiptId(), userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Không tìm thấy receipt: " + req.getReceiptId()));

        if (receipt.getTransactionId() != null) {
            throw new BusinessException("Hóa đơn này đã được tạo giao dịch trước đó.", HttpStatus.CONFLICT);
        }

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

        if (categoryId == null) {
            categoryId = categoryRepository.findByUserIdOrSystemAndKind(userId, com.finance.finance.common.enums.CategoryKind.EXPENSE).stream()
                    .findFirst()
                    .map(com.finance.finance.modules.category.entity.Category::getId)
                    .orElse(null);
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
                .receiptId(receipt.getId())
                .receiptUrl(receipt.getImageUrl())
                .build();

        TransactionResponse txResponse = transactionService.createTransaction(userId, txReq);

        // Link receipt to the new transaction
        receipt.setTransactionId(txResponse.getId());
        receiptRepository.save(receipt);

        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.OCR_TRANSACTION_CREATED)
                    .actorId(userId)
                    .subjectUserId(userId)
                    .source(AuditSource.OCR)
                    .resourceType("RECEIPT")
                    .resourceId(receipt.getId())
                    .relatedResourceId(txResponse.getId())
                    .metadata(java.util.Map.of("amount", amount, "currency", currencyCode))
                    .build());
        }

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
        if (receipt.getImageUrl() != null) {
            try {
                Path filePath = Paths.get(receipt.getImageUrl().replaceFirst("^/", ""));
                Files.deleteIfExists(filePath);
            } catch (Exception e) {
                log.warn("Could not delete receipt file: {}", receipt.getImageUrl());
            }
        }
        receiptRepository.delete(receipt);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private OcrReceiptResponse toResponse(Receipt r) {
        String signedImageUrl = (attachmentUrlSigner != null && r.getImageUrl() != null)
                ? attachmentUrlSigner.createReceiptUrl(r.getImageUrl(), r.getUserId())
                : r.getImageUrl();
        return OcrReceiptResponse.builder()
                .id(r.getId())
                .imageUrl(signedImageUrl)
                .kind(r.getKind())
                .merchantName(r.getMerchantName())
                .transactionDate(r.getTransactionDate())
                .transactionTime(r.getTransactionTime())
                .totalAmount(r.getTotalAmount())
                .currency(r.getCurrency())
                .confidence(r.getConfidence() != null ? r.getConfidence().doubleValue() : null)
                .needsReview(r.getNeedsReview())
                .rejectReason(null) // receipts đã lưu DB đều là hợp lệ
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
        private String engine;

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

        @JsonProperty("reject_reason")
        private String rejectReason;

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
