package com.finance.finance.modules.ocr.controller;

import com.finance.finance.modules.ocr.dto.CreateTransactionFromOcrRequest;
import com.finance.finance.modules.ocr.dto.OcrReceiptResponse;
import com.finance.finance.modules.ocr.service.OcrService;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

/**
 * REST Controller for OCR / Receipt scanning.
 * Base path: /api/v1/ocr
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;

    /**
     * POST /api/v1/ocr/receipts
     * Upload a receipt image, run OCR, and return the extracted data.
     */
    @PostMapping(value = "/receipts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OcrReceiptResponse> scanReceipt(
            @AuthenticationPrincipal User user,
            @RequestPart("image") MultipartFile image) throws IOException {

        UUID userId = user.getId();
        log.info("POST /ocr/receipts - user: {}, file: {}, size: {}",
                userId, image.getOriginalFilename(), image.getSize());

        OcrReceiptResponse response = ocrService.scanReceipt(userId, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * POST /api/v1/ocr/receipts/{id}/create-transaction
     * Create a transaction from a previously scanned receipt.
     */
    @PostMapping("/receipts/{id}/create-transaction")
    public ResponseEntity<TransactionResponse> createTransactionFromOcr(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody CreateTransactionFromOcrRequest request) {

        UUID userId = user.getId();
        log.info("POST /ocr/receipts/{}/create-transaction - user: {}", id, userId);

        // Ensure the receiptId in the path is authoritative
        request.setReceiptId(id);

        TransactionResponse response = ocrService.createTransactionFromOcr(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/ocr/receipts
     * List receipts for the authenticated user (paginated).
     */
    @GetMapping("/receipts")
    public ResponseEntity<Page<OcrReceiptResponse>> getReceipts(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {

        UUID userId = user.getId();
        log.debug("GET /ocr/receipts - user: {}, page: {}, pageSize: {}", userId, page, pageSize);

        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), pageSize);
        Page<OcrReceiptResponse> response = ocrService.getReceipts(userId, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/v1/ocr/receipts/{id}
     * Delete a receipt.
     */
    @DeleteMapping("/receipts/{id}")
    public ResponseEntity<Void> deleteReceipt(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {

        UUID userId = user.getId();
        log.info("DELETE /ocr/receipts/{} - user: {}", id, userId);

        ocrService.deleteReceipt(userId, id);
        return ResponseEntity.ok().build();
    }
}
