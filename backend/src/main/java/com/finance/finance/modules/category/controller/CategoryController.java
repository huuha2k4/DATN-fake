package com.finance.finance.modules.category.controller;

import com.finance.finance.common.enums.CategoryKind;
import com.finance.finance.modules.category.dto.request.CreateCategoryRequest;
import com.finance.finance.modules.category.dto.request.UpdateCategoryRequest;
import com.finance.finance.modules.category.dto.response.CategoryListResponse;
import com.finance.finance.modules.category.dto.response.CategoryResponse;
import com.finance.finance.modules.category.service.CategoryService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createCategory(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateCategoryRequest request) {
        log.info("Create category request from user: {}", user.getId());

        CategoryResponse categoryResponse = categoryService.createCategory(user.getId(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", categoryResponse);
        response.put("message", "Danh mục đã được tạo thành công");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCategories(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) CategoryKind kind,
            @RequestParam(required = false, defaultValue = "true") Boolean includeSystem) {
        log.info("Get categories request from user: {}", user.getId());

        CategoryListResponse categoryListResponse = categoryService.getCategories(user.getId(), kind, includeSystem);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", categoryListResponse);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCategoryById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        log.info("Get category: {} for user: {}", id, user.getId());

        CategoryResponse categoryResponse = categoryService.getCategoryById(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", categoryResponse);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateCategory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        log.info("Update category: {} for user: {}", id, user.getId());

        CategoryResponse categoryResponse = categoryService.updateCategory(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", categoryResponse);
        response.put("message", "Danh mục đã được cập nhật");

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteCategory(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        log.info("Delete category: {} for user: {}", id, user.getId());

        categoryService.deleteCategory(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Danh mục đã được xóa");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchCategories(
            @AuthenticationPrincipal User user,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("Search categories with keyword: {}", keyword);

        Pageable pageable = PageRequest.of(page, size);
        Page<CategoryResponse> categoryPage = categoryService.searchCategories(user.getId(), keyword, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", Map.of(
                "categories", categoryPage.getContent(),
                "page", page,
                "size", size,
                "totalElements", categoryPage.getTotalElements(),
                "totalPages", categoryPage.getTotalPages()
        ));

        return ResponseEntity.ok(response);
    }
}
