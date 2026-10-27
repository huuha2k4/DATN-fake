package com.finance.finance.modules.debt.controller;

import com.finance.finance.common.enums.DebtStatus;
import com.finance.finance.common.enums.DebtType;
import com.finance.finance.modules.debt.dto.request.CreateDebtRequest;
import com.finance.finance.modules.debt.dto.request.RecordPaymentRequest;
import com.finance.finance.modules.debt.dto.request.UpdateDebtRequest;
import com.finance.finance.modules.debt.dto.response.*;
import com.finance.finance.modules.debt.service.DebtService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Controller cho quản lý nợ vay/cho vay
 * Cung cấp 8 REST endpoints để tạo, quản lý, theo dõi và trả nợ
 */
@RestController
@RequestMapping("/api/v1/debts")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    /**
     * 1. Tạo khoản nợ mới (vay/cho vay)
     * POST /api/v1/debts
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createDebt(
            @Valid @RequestBody CreateDebtRequest request,
            @AuthenticationPrincipal User user
    ) {
        DebtResponse response = debtService.createDebt(user.getId(), request);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", "Khoản nợ đã được tạo thành công");
        
        return ResponseEntity.status(HttpStatus.CREATED).body(responseBody);
    }

    /**
     * 2. Lấy danh sách khoản nợ
     * GET /api/v1/debts?debt_type=BORROWING&status=ACTIVE
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getDebts(
            @RequestParam(name = "debt_type", required = false) DebtType debtType,
            @RequestParam(required = false) DebtStatus status,
            @AuthenticationPrincipal User user
    ) {
        DebtListResponse response = debtService.getDebts(user.getId(), debtType, status);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 3. Lấy chi tiết một khoản nợ
     * GET /api/v1/debts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDebtById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        DebtDetailResponse response = debtService.getDebtById(user.getId(), id);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 4. Cập nhật khoản nợ
     * PUT /api/v1/debts/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateDebt(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDebtRequest request,
            @AuthenticationPrincipal User user
    ) {
        DebtResponse response = debtService.updateDebt(user.getId(), id, request);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", "Khoản nợ đã được cập nhật thành công");
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 5. Xóa khoản nợ (soft delete)
     * DELETE /api/v1/debts/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDebt(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        debtService.deleteDebt(user.getId(), id);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("message", "Khoản nợ đã được xóa thành công");
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 6. Ghi nhận trả nợ
     * POST /api/v1/debts/{id}/payments
     */
    @PostMapping("/{id}/payments")
    public ResponseEntity<Map<String, Object>> recordPayment(
            @PathVariable UUID id,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal User user
    ) {
        PaymentResponse response = debtService.recordPayment(user.getId(), id, request);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        responseBody.put("message", "Đã ghi nhận trả nợ thành công");
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 7. Lấy lịch trả nợ dự kiến
     * GET /api/v1/debts/{id}/schedule
     */
    @GetMapping("/{id}/schedule")
    public ResponseEntity<Map<String, Object>> getPaymentSchedule(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        ScheduleResponse response = debtService.getPaymentSchedule(user.getId(), id);
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 8. Lấy tổng quan tất cả khoản nợ
     * GET /api/v1/debts/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @AuthenticationPrincipal User user
    ) {
        SummaryResponse response = debtService.getSummary(user.getId());
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("data", response);
        
        return ResponseEntity.ok(responseBody);
    }
}
