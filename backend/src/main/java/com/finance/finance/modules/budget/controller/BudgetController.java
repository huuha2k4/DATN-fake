package com.finance.finance.modules.budget.controller;

import com.finance.finance.common.enums.BudgetPeriodType;
import com.finance.finance.common.enums.BudgetStatus;
import com.finance.finance.modules.budget.dto.request.*;
import com.finance.finance.modules.budget.dto.response.*;
import com.finance.finance.modules.budget.service.BudgetService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for budgets (ngân sách) endpoints
 * Base path: /api/v1/budgets
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    /**
     * Tạo ngân sách mới
     * POST /api/v1/budgets
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createBudget(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateBudgetRequest request) {
        log.info("Create budget request from user: {}", user.getId());

        BudgetResponse budgetResponse = budgetService.createBudget(user.getId(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", budgetResponse);
        response.put("message", "Ngân sách đã được tạo thành công");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Thêm ngân sách cho từng danh mục chi tiêu theo tháng
     * POST /api/v1/budgets/category-item
     */
    @PostMapping("/category-item")
    public ResponseEntity<Map<String, Object>> addCategoryBudgetForMonth(
            @AuthenticationPrincipal User user,
            @RequestParam Integer year,
            @RequestParam Integer month,
            @Valid @RequestBody BudgetItemRequest request) {
        log.info("Add category budget for month {}/{} user: {}", month, year, user.getId());

        BudgetResponse.BudgetItemResponse itemResponse = budgetService.addCategoryBudgetForMonth(
                user.getId(), year, month, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", itemResponse);
        response.put("message", "Đã thiết lập hạn mức danh mục thành công");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy danh sách ngân sách
     * GET /api/v1/budgets
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getBudgets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) BudgetStatus status,
            @RequestParam(required = false) BudgetPeriodType periodType,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        log.info("Get budgets request from user: {}", user.getId());

        BudgetListResponse budgetListResponse = budgetService.getBudgets(
                user.getId(), status, periodType, year, month);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", budgetListResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy chi tiết ngân sách
     * GET /api/v1/budgets/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBudgetById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        log.info("Get budget detail: {} for user: {}", id, user.getId());

        BudgetResponse budgetResponse = budgetService.getBudgetById(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", budgetResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Cập nhật ngân sách
     * PUT /api/v1/budgets/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBudget(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBudgetRequest request) {
        log.info("Update budget: {} for user: {}", id, user.getId());

        BudgetResponse budgetResponse = budgetService.updateBudget(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", budgetResponse);
        response.put("message", "Ngân sách đã được cập nhật");

        return ResponseEntity.ok(response);
    }

    /**
     * Xóa ngân sách
     * DELETE /api/v1/budgets/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteBudget(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam Integer version) {
        log.info("Delete budget: {} for user: {}", id, user.getId());

        budgetService.deleteBudget(user.getId(), id, version);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Ngân sách đã được xóa");

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy trạng thái chi tiêu hiện tại
     * GET /api/v1/budgets/{id}/status
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getBudgetStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        log.info("Get budget status: {} for user: {}", id, user.getId());

        BudgetStatusResponse statusResponse = budgetService.getBudgetStatus(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", statusResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Thêm budget item (category) vào ngân sách
     * POST /api/v1/budgets/{id}/items
     */
    @PostMapping("/{id}/items")
    public ResponseEntity<Map<String, Object>> addBudgetItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody BudgetItemRequest request) {
        log.info("Add budget item to budget: {} for user: {}", id, user.getId());

        BudgetResponse.BudgetItemResponse itemResponse = budgetService.addBudgetItem(
                user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", itemResponse);
        response.put("message", "Đã thêm danh mục vào ngân sách");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Cập nhật budget item
     * PUT /api/v1/budgets/{id}/items/{itemId}
     */
    @PutMapping("/{id}/items/{itemId}")
    public ResponseEntity<Map<String, Object>> updateBudgetItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateBudgetItemRequest request) {
        log.info("Update budget item: {} in budget: {} for user: {}", itemId, id, user.getId());

        BudgetResponse.BudgetItemResponse itemResponse = budgetService.updateBudgetItem(
                user.getId(), id, itemId, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", itemResponse);
        response.put("message", "Đã cập nhật danh mục trong ngân sách");

        return ResponseEntity.ok(response);
    }

    /**
     * Xóa budget item
     * DELETE /api/v1/budgets/{id}/items/{itemId}
     */
    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Map<String, Object>> deleteBudgetItem(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID itemId) {
        log.info("Delete budget item: {} from budget: {} for user: {}", itemId, id, user.getId());

        budgetService.deleteBudgetItem(user.getId(), id, itemId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã xóa danh mục khỏi ngân sách");

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy tổng quan tất cả ngân sách
     * GET /api/v1/budgets/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getBudgetsSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "current_month") String period) {
        log.info("Get budgets summary for user: {}", user.getId());

        BudgetSummaryResponse summaryResponse = budgetService.getBudgetsSummary(user.getId(), period);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", summaryResponse);

        return ResponseEntity.ok(response);
    }

    /**
     * Copy ngân sách sang kỳ khác
     * POST /api/v1/budgets/{id}/duplicate
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<Map<String, Object>> duplicateBudget(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody DuplicateBudgetRequest request) {
        log.info("Duplicate budget: {} for user: {}", id, user.getId());

        BudgetResponse budgetResponse = budgetService.duplicateBudget(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", budgetResponse);
        response.put("message", "Đã tạo ngân sách mới từ template");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
