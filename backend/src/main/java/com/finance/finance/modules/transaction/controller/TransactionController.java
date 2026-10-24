package com.finance.finance.modules.transaction.controller;

import com.finance.finance.modules.transaction.dto.request.*;
import com.finance.finance.modules.transaction.dto.response.*;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Transaction Management
 * Base Path: /api/v1/transactions
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {
    
    private final TransactionService transactionService;
    
    /**
     * POST /api/v1/transactions
     * Create a new transaction (INCOME, EXPENSE, or TRANSFER)
     */
    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateTransactionRequest request) {
        
        UUID userId = user.getId();
        log.info("POST /transactions - user: {}, type: {}", userId, request.getTransactionType());
        
        TransactionResponse response = transactionService.createTransaction(userId, request);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * GET /api/v1/transactions
     * List transactions with filters and pagination
     */
    @GetMapping
    public ResponseEntity<TransactionListResponse> listTransactions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer pageSize,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) String transactionType,
            @RequestParam(required = false) java.math.BigDecimal minAmount,
            @RequestParam(required = false) java.math.BigDecimal maxAmount,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryStatus,
            @RequestParam(required = false) Boolean isExcludedFromReport,
            @RequestParam(required = false, defaultValue = "transaction_date") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {
        
        UUID userId = user.getId();
        log.debug("GET /transactions - user: {}, page: {}", userId, page);
        
        // Build filter
        TransactionFilter filter = TransactionFilter.builder()
                .page(page)
                .pageSize(pageSize)
                .fromDate(fromDate)
                .toDate(toDate)
                .accountId(accountId)
                .categoryId(categoryId)
                .merchantId(merchantId)
                .transactionType(transactionType != null ? 
                        com.finance.finance.common.enums.TransactionType.valueOf(transactionType) : null)
                .minAmount(minAmount)
                .maxAmount(maxAmount)
                .search(search)
                .categoryStatus(categoryStatus != null ? 
                        com.finance.finance.common.enums.CategoryStatus.valueOf(categoryStatus) : null)
                .isExcludedFromReport(isExcludedFromReport)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();
        
        TransactionListResponse response = transactionService.listTransactions(userId, filter);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/v1/transactions/{id}
     * Get transaction details by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        
        UUID userId = user.getId();
        log.debug("GET /transactions/{} - user: {}", id, userId);
        
        TransactionResponse response = transactionService.getTransactionById(userId, id);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * PUT /api/v1/transactions/{id}
     * Update transaction
     */
    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTransactionRequest request) {
        
        UUID userId = user.getId();
        log.info("PUT /transactions/{} - user: {}", id, userId);
        
        TransactionResponse response = transactionService.updateTransaction(userId, id, request);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * DELETE /api/v1/transactions/{id}
     * Delete transaction (soft delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam(required = false) Long version) {
        
        UUID userId = user.getId();
        log.info("DELETE /transactions/{} - user: {}", id, userId);
        
        transactionService.deleteTransaction(userId, id, version);
        
        return ResponseEntity.ok().build();
    }
    
    /**
     * POST /api/v1/transactions/batch
     * Batch create transactions
     */
    @PostMapping("/batch")
    public ResponseEntity<BatchCreateResponse> batchCreateTransactions(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody BatchCreateRequest request) {
        
        UUID userId = user.getId();
        log.info("POST /transactions/batch - user: {}, count: {}", userId, request.getTransactions().size());
        
        BatchCreateResponse response = transactionService.batchCreateTransactions(userId, request);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * POST /api/v1/transactions/{id}/split
     * Split a transaction into multiple parts
     */
    @PostMapping("/{id}/split")
    public ResponseEntity<List<TransactionResponse>> splitTransaction(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody SplitTransactionRequest request) {
        
        UUID userId = user.getId();
        log.info("POST /transactions/{}/split - user: {}, parts: {}", id, userId, request.getSplits().size());
        
        List<TransactionResponse> response = transactionService.splitTransaction(userId, id, request);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/v1/transactions/summary
     * Get transaction summary by period
     */
    @GetMapping("/summary")
    public ResponseEntity<TransactionSummaryResponse> getTransactionSummary(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "day") String groupBy,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) String currencyCode) {
        
        UUID userId = user.getId();
        log.debug("GET /transactions/summary - user: {}, from: {}, to: {}", userId, fromDate, toDate);
        
        TransactionSummaryResponse response = transactionService.getTransactionSummary(
                userId, fromDate, toDate, groupBy);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/v1/transactions/by-category
     * Group transactions by category
     */
    @GetMapping("/by-category")
    public ResponseEntity<TransactionSummaryResponse> getTransactionsByCategory(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "EXPENSE") String transactionType) {
        
        UUID userId = user.getId();
        log.debug("GET /transactions/by-category - user: {}, type: {}", userId, transactionType);
        
        // Reuse summary endpoint with category grouping
        TransactionSummaryResponse response = transactionService.getTransactionSummary(
                userId, fromDate, toDate, "category");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/v1/transactions/trends
     * Get spending trends
     */
    @GetMapping("/trends")
    public ResponseEntity<TransactionSummaryResponse> getTransactionTrends(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "6months") String period,
            @RequestParam(required = false) UUID categoryId) {
        
        UUID userId = user.getId();
        log.debug("GET /transactions/trends - user: {}, period: {}", userId, period);
        
        // Calculate date range based on period
        LocalDate toDate = LocalDate.now();
        LocalDate fromDate = switch (period) {
            case "3months" -> toDate.minusMonths(3);
            case "6months" -> toDate.minusMonths(6);
            case "1year" -> toDate.minusYears(1);
            default -> toDate.minusMonths(6);
        };
        
        TransactionSummaryResponse response = transactionService.getTransactionSummary(
                userId, fromDate, toDate, "month");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * POST /api/v1/transactions/{id}/attachments
     * Upload attachment for transaction
     * TODO: Implement file upload with multipart/form-data
     */
    @PostMapping("/{id}/attachments")
    public ResponseEntity<Void> uploadAttachment(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        
        UUID userId = user.getId();
        log.info("POST /transactions/{}/attachments - user: {}", id, userId);
        
        // TODO: Implement attachment upload
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
    
    /**
     * DELETE /api/v1/transactions/{id}/attachments/{attachmentId}
     * Delete attachment
     * TODO: Implement attachment deletion
     */
    @DeleteMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID attachmentId) {
        
        UUID userId = user.getId();
        log.info("DELETE /transactions/{}/attachments/{} - user: {}", id, attachmentId, userId);
        
        // TODO: Implement attachment deletion
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }
}
