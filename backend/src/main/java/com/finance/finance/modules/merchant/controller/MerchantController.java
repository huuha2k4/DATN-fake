package com.finance.finance.modules.merchant.controller;

import com.finance.finance.modules.merchant.dto.request.CreateMerchantRequest;
import com.finance.finance.modules.merchant.dto.request.UpdateMerchantRequest;
import com.finance.finance.modules.merchant.dto.response.MerchantResponse;
import com.finance.finance.modules.merchant.service.MerchantService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createMerchant(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateMerchantRequest request) {
        MerchantResponse merchantResponse = merchantService.createMerchant(user.getId(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", merchantResponse);
        response.put("message", "Merchant đã được tạo");

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMerchants(@AuthenticationPrincipal User user) {
        List<MerchantResponse> merchants = merchantService.getMerchants(user.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", Map.of("merchants", merchants));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getMerchantById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        MerchantResponse merchantResponse = merchantService.getMerchantById(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", merchantResponse);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateMerchant(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMerchantRequest request) {
        MerchantResponse merchantResponse = merchantService.updateMerchant(user.getId(), id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", merchantResponse);
        response.put("message", "Merchant đã được cập nhật");

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteMerchant(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        merchantService.deleteMerchant(user.getId(), id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Merchant đã được xóa");

        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchMerchants(
            @AuthenticationPrincipal User user,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MerchantResponse> merchantPage = merchantService.searchMerchants(
                user.getId(), keyword, PageRequest.of(page, size));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", Map.of(
                "merchants", merchantPage.getContent(),
                "totalElements", merchantPage.getTotalElements()
        ));

        return ResponseEntity.ok(response);
    }
}
