package com.finance.finance.modules.group.controller;

import com.finance.finance.modules.group.dto.request.CreateMoneyRequest;
import com.finance.finance.modules.group.dto.request.RespondSharingRequest;
import com.finance.finance.modules.group.dto.response.DataSharingRequestResponse;
import com.finance.finance.modules.group.dto.response.SpendRequestResponse;
import com.finance.finance.modules.group.service.ChildDataSharingService;
import com.finance.finance.modules.group.service.ChildManagementService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller cho các API dành riêng cho con (child user)
 * - Xem và phản hồi yêu cầu chia sẻ dữ liệu
 * - Thu hồi quyền truy cập
 * - Xin tiền từ bố mẹ
 */
@RestController
@RequestMapping("/api/v1/child")
@RequiredArgsConstructor
public class ChildController {

    private final ChildDataSharingService childDataSharingService;
    private final ChildManagementService childManagementService;

    // ============================================================
    // DATA SHARING APIs
    // ============================================================

    /**
     * Xem danh sách yêu cầu chia sẻ dữ liệu đang chờ phê duyệt
     * GET /api/v1/child/sharing-requests
     */
    @GetMapping("/sharing-requests")
    public ResponseEntity<List<DataSharingRequestResponse>> getPendingSharingRequests(
            @AuthenticationPrincipal User currentUser) {
        List<DataSharingRequestResponse> requests = childDataSharingService.getPendingRequests(currentUser.getId());
        return ResponseEntity.ok(requests);
    }

    /**
     * Con phản hồi yêu cầu chia sẻ dữ liệu (approve hoặc reject)
     * POST /api/v1/child/sharing-requests/{requestId}/respond
     */
    @PostMapping("/sharing-requests/{requestId}/respond")
    public ResponseEntity<DataSharingRequestResponse> respondToSharingRequest(
            @PathVariable UUID requestId,
            @Valid @RequestBody RespondSharingRequest request,
            @AuthenticationPrincipal User currentUser) {
        DataSharingRequestResponse response = childDataSharingService.respondToRequest(
                requestId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Thu hồi tất cả quyền truy cập dữ liệu của một ví
     * POST /api/v1/child/wallets/{walletId}/revoke-access
     */
    @PostMapping("/wallets/{walletId}/revoke-access")
    public ResponseEntity<Void> revokeDataAccess(
            @PathVariable UUID walletId,
            @AuthenticationPrincipal User currentUser) {
        childDataSharingService.revokeAccess(walletId, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    // ============================================================
    // MONEY REQUEST APIs
    // ============================================================

    /**
     * Con xin tiền từ bố mẹ trong nhóm gia đình
     * POST /api/v1/child/groups/{groupId}/wallets/{walletId}/request-money
     */
    @PostMapping("/groups/{groupId}/wallets/{walletId}/request-money")
    public ResponseEntity<SpendRequestResponse> requestMoney(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody CreateMoneyRequest request,
            @AuthenticationPrincipal User currentUser) {
        SpendRequestResponse response = childManagementService.createMoneyRequest(
                groupId, walletId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Xem danh sách yêu cầu xin tiền của con
     * GET /api/v1/child/groups/{groupId}/wallets/{walletId}/money-requests
     */
    @GetMapping("/groups/{groupId}/wallets/{walletId}/money-requests")
    public ResponseEntity<org.springframework.data.domain.Page<SpendRequestResponse>> getMoneyRequests(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @RequestParam(required = false) com.finance.finance.common.enums.SpendRequestStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        
        org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(page, size);
        
        org.springframework.data.domain.Page<SpendRequestResponse> requests = 
                childManagementService.getSpendRequests(groupId, walletId, status, pageable, currentUser.getId());
        
        return ResponseEntity.ok(requests);
    }
}
