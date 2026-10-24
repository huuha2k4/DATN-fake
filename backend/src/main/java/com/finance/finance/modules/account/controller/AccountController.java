package com.finance.finance.modules.account.controller;

import com.finance.finance.common.enums.AccountType;
import com.finance.finance.modules.account.dto.request.AdjustBalanceRequest;
import com.finance.finance.modules.account.dto.request.CreateAccountRequest;
import com.finance.finance.modules.account.dto.request.UpdateAccountRequest;
import com.finance.finance.modules.account.dto.response.*;
import com.finance.finance.modules.account.service.AccountService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for accounts (ví/tài khoản) endpoints
 * Base path: /api/v1/accounts
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /**
     * Lấy danh sách các loại ví / tài khoản hỗ trợ
     * GET /api/v1/accounts/types
     */
    @GetMapping("/types")
    public ResponseEntity<Map<String, Object>> getAccountTypes() {
        List<AccountTypeMetadataResponse> types = accountService.getAccountTypes();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", types);

        return ResponseEntity.ok(response);
    }

    /**
     * Tạo account mới
     * POST /api/v1/accounts
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createAccount(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateAccountRequest request) {
        log.info("Create account request from user: {}", user.getId());

        AccountResponse accountResponse = accountService.createAccount(user.getId(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountResponse);
        response.put("message", "Tài khoản đã được tạo thành công");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy danh sách accounts
     * GET /api/v1/accounts
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAccounts(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive,
            @RequestParam(required = false) AccountType accountType,
            @RequestParam(required = false) String currencyCode) {
        log.info("Get accounts request from user: {}", user.getId());

        AccountListResponse accountListResponse = accountService.getAccounts(
                user.getId(), includeInactive, accountType, currencyCode);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountListResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy chi tiết account
     * GET /api/v1/accounts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAccountById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "false") Boolean includeStats) {
        log.info("Get account detail: {} for user: {}", id, user.getId());

        AccountResponse accountResponse = accountService.getAccountById(user.getId(), id, includeStats);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Cập nhật account
     * PUT /api/v1/accounts/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateAccount(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAccountRequest request) {
        log.info("Update account: {} for user: {}", id, user.getId());

        AccountResponse accountResponse = accountService.updateAccount(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", accountResponse);
        response.put("message", "Tài khoản đã được cập nhật");

        return ResponseEntity.ok(response);
    }

    /**
     * Xóa account
     * DELETE /api/v1/accounts/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAccount(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam Integer version,
            @RequestParam(required = false) UUID moveTransactionsTo) {
        log.info("Delete account: {} for user: {}", id, user.getId());

        accountService.deleteAccount(user.getId(), id, version, moveTransactionsTo);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", moveTransactionsTo != null ?
                "Tài khoản đã được xóa. Giao dịch đã được chuyển sang tài khoản khác." :
                "Tài khoản đã được xóa");

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy tổng quan tài sản
     * GET /api/v1/accounts/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getAccountsSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "VND") String baseCurrency) {
        log.info("Get accounts summary for user: {}", user.getId());

        AccountSummaryResponse summaryResponse = accountService.getAccountsSummary(user.getId(), baseCurrency);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", summaryResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Điều chỉnh số dư
     * POST /api/v1/accounts/{id}/adjust-balance
     */
    @PostMapping("/{id}/adjust-balance")
    public ResponseEntity<Map<String, Object>> adjustBalance(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody AdjustBalanceRequest request) {
        log.info("Adjust balance for account: {} by user: {}", id, user.getId());

        AdjustBalanceResponse adjustResponse = accountService.adjustBalance(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", adjustResponse);
        response.put("message", "Số dư đã được điều chỉnh. Giao dịch điều chỉnh đã được tạo.");

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy lịch sử số dư
     * GET /api/v1/accounts/{id}/balance-history
     */
    @GetMapping("/{id}/balance-history")
    public ResponseEntity<Map<String, Object>> getBalanceHistory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "day") String interval) {
        log.info("Get balance history for account: {} from {} to {}", id, fromDate, toDate);

        BalanceHistoryResponse historyResponse = accountService.getBalanceHistory(
                user.getId(), id, fromDate, toDate, interval);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", historyResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Liên kết với ngân hàng (TODO: Implement with Open Banking)
     * POST /api/v1/accounts/{id}/link-bank
     */
    @PostMapping("/{id}/link-bank")
    public ResponseEntity<Map<String, Object>> linkBank(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestBody Map<String, Object> request) {
        log.info("Link bank for account: {} by user: {}", id, user.getId());

        // TODO: Implement Open Banking integration

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Tính năng liên kết ngân hàng đang được phát triển");

        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(response);
    }

    /**
     * Đồng bộ số dư từ ngân hàng (TODO: Implement with Open Banking)
     * POST /api/v1/accounts/{id}/sync-balance
     */
    @PostMapping("/{id}/sync-balance")
    public ResponseEntity<Map<String, Object>> syncBalance(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        log.info("Sync balance for account: {} by user: {}", id, user.getId());

        // TODO: Implement Open Banking integration

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Tính năng đồng bộ ngân hàng đang được phát triển");

        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(response);
    }
}
