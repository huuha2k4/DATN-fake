package com.finance.finance.modules.group.controller;

import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.common.enums.ChoreStatus;
import com.finance.finance.common.enums.CommentableType;
import com.finance.finance.common.enums.SpendRequestStatus;
import com.finance.finance.modules.group.dto.request.*;
import com.finance.finance.modules.group.dto.response.*;
import com.finance.finance.modules.group.service.*;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class GroupController {

    private final GroupService groupService;
    private final GroupExpenseService expenseService;
    private final GroupSettlementService settlementService;
    private final CommentService commentService;
    private final GroupMessageService messageService;
    private final ChildWalletService childWalletService;
    private final ChildManagementService childManagementService;
    private final GroupActivityService activityService;

    // ============================================================
    // 1. GROUPS & MEMBERS MANAGEMENT (12 endpoints)
    // ============================================================

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal User currentUser) {
        GroupResponse response = groupService.createGroup(request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<GroupResponse>> getGroups(
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<GroupResponse> response = groupService.getGroups(pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailResponse> getGroupDetail(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        GroupDetailResponse response = groupService.getGroupDetail(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<GroupResponse> updateGroup(
            @PathVariable UUID groupId,
            @Valid @RequestBody UpdateGroupRequest request,
            @AuthenticationPrincipal User currentUser) {
        GroupResponse response = groupService.updateGroup(groupId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/archive")
    public ResponseEntity<GroupResponse> archiveGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        GroupResponse response = groupService.archiveGroup(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/unarchive")
    public ResponseEntity<GroupResponse> unarchiveGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        GroupResponse response = groupService.unarchiveGroup(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        groupService.deleteGroup(groupId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<com.finance.finance.modules.group.dto.response.GroupInvitationResponse> addMember(
            @PathVariable UUID groupId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        com.finance.finance.modules.group.dto.response.GroupInvitationResponse response = groupService.inviteMember(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/invitations/pending")
    public ResponseEntity<List<com.finance.finance.modules.group.dto.response.GroupInvitationResponse>> getPendingInvitations(
            @AuthenticationPrincipal User currentUser) {
        List<com.finance.finance.modules.group.dto.response.GroupInvitationResponse> response = groupService.getPendingInvitations(currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<MemberResponse> acceptInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User currentUser) {
        MemberResponse response = groupService.acceptInvitation(invitationId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/invitations/{invitationId}/reject")
    public ResponseEntity<Void> rejectInvitation(
            @PathVariable UUID invitationId,
            @AuthenticationPrincipal User currentUser) {
        groupService.rejectInvitation(invitationId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        List<MemberResponse> response = groupService.getMembers(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/members/{userId}")
    public ResponseEntity<MemberResponse> getMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User currentUser) {
        MemberResponse response = groupService.getMember(groupId, userId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}/members/{userId}")
    public ResponseEntity<MemberResponse> updateMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        MemberResponse response = groupService.updateMember(groupId, userId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User currentUser) {
        groupService.removeMember(groupId, userId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // 2. EXPENSES & BALANCES (6 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/expenses")
    public ResponseEntity<ExpenseResponse> createExpense(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateExpenseRequest request,
            @AuthenticationPrincipal User currentUser) {
        ExpenseResponse response = expenseService.createExpense(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/expenses")
    public ResponseEntity<Page<ExpenseResponse>> getExpenses(
            @PathVariable UUID groupId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<ExpenseResponse> response = expenseService.getExpenses(groupId, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/expenses/{expenseId}")
    public ResponseEntity<ExpenseResponse> getExpense(
            @PathVariable UUID groupId,
            @PathVariable UUID expenseId,
            @AuthenticationPrincipal User currentUser) {
        ExpenseResponse response = expenseService.getExpense(groupId, expenseId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}/expenses/{expenseId}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable UUID groupId,
            @PathVariable UUID expenseId,
            @Valid @RequestBody UpdateExpenseRequest request,
            @AuthenticationPrincipal User currentUser) {
        ExpenseResponse response = expenseService.updateExpense(groupId, expenseId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/expenses/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable UUID groupId,
            @PathVariable UUID expenseId,
            @AuthenticationPrincipal User currentUser) {
        expenseService.deleteExpense(groupId, expenseId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{groupId}/balances")
    public ResponseEntity<BalanceResponse> getBalances(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        BalanceResponse response = expenseService.getBalances(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // 3. SETTLEMENTS (4 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/settlements")
    public ResponseEntity<SettlementResponse> createSettlement(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateSettlementRequest request,
            @AuthenticationPrincipal User currentUser) {
        SettlementResponse response = settlementService.createSettlement(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/settlements")
    public ResponseEntity<Page<SettlementResponse>> getSettlements(
            @PathVariable UUID groupId,
            @RequestParam(required = false) String status,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<SettlementResponse> response = settlementService.getSettlements(groupId, status, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/settlements/{settlementId}/confirm")
    public ResponseEntity<SettlementResponse> confirmSettlement(
            @PathVariable UUID groupId,
            @PathVariable UUID settlementId,
            @AuthenticationPrincipal User currentUser) {
        SettlementResponse response = settlementService.confirmSettlement(groupId, settlementId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/settlements/{settlementId}/reject")
    public ResponseEntity<SettlementResponse> rejectSettlement(
            @PathVariable UUID groupId,
            @PathVariable UUID settlementId,
            @Valid @RequestBody RejectSettlementRequest request,
            @AuthenticationPrincipal User currentUser) {
        SettlementResponse response = settlementService.rejectSettlement(groupId, settlementId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // 4. COMMENTS (5 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/comments")
    public ResponseEntity<CommentResponse> createComment(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        CommentResponse response = commentService.createComment(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/comments")
    public ResponseEntity<Page<CommentResponse>> getComments(
            @PathVariable UUID groupId,
            @RequestParam CommentableType commentableType,
            @RequestParam UUID commentableId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<CommentResponse> response = commentService.getComments(
                groupId, commentableType, commentableId, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/comments/{commentId}/thread")
    public ResponseEntity<List<CommentResponse>> getCommentThread(
            @PathVariable UUID groupId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal User currentUser) {
        List<CommentResponse> response = commentService.getCommentThread(groupId, commentId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable UUID groupId,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        CommentResponse response = commentService.updateComment(groupId, commentId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID groupId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal User currentUser) {
        commentService.deleteComment(groupId, commentId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // 5. GROUP MESSAGES / CHAT (7 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable UUID groupId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User currentUser) {
        MessageResponse response = messageService.sendMessage(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/{groupId}/messages/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageResponse.AttachmentSummary> uploadMessageAttachment(
            @PathVariable UUID groupId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        try {
            MessageResponse.AttachmentSummary summary = messageService.uploadAttachment(groupId, file, currentUser.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(summary);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable UUID groupId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<MessageResponse> response = messageService.getMessages(groupId, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<MessageResponse> getMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User currentUser) {
        MessageResponse response = messageService.getMessage(groupId, messageId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<MessageResponse> updateMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            @Valid @RequestBody UpdateMessageRequest request,
            @AuthenticationPrincipal User currentUser) {
        MessageResponse response = messageService.updateMessage(groupId, messageId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID groupId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User currentUser) {
        messageService.deleteMessage(groupId, messageId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/messages/mark-read")
    public ResponseEntity<Void> markMessagesAsRead(
            @PathVariable UUID groupId,
            @Valid @RequestBody MarkMessagesReadRequest request,
            @AuthenticationPrincipal User currentUser) {
        messageService.markAsRead(groupId, request, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/messages/typing")
    public ResponseEntity<Void> reportTyping(
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "true") boolean typing,
            @AuthenticationPrincipal User currentUser) {
        messageService.setTyping(groupId, currentUser.getId(), typing);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{groupId}/messages/typing")
    public ResponseEntity<Map<String, Object>> getTypingUsers(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        List<UUID> typingUserIds = messageService.getTypingUsers(groupId, currentUser.getId());
        return ResponseEntity.ok(Map.of("typingUserIds", typingUserIds));
    }

    @GetMapping("/{groupId}/messages/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        long count = messageService.getUnreadCount(groupId, currentUser.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // ============================================================
    // 6. CHILD WALLETS (7 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/child-wallets")
    public ResponseEntity<ChildWalletResponse> createChildWallet(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateChildWalletRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChildWalletResponse response = childWalletService.createWallet(groupId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/child-wallets")
    public ResponseEntity<Page<ChildWalletResponse>> getChildWallets(
            @PathVariable UUID groupId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<ChildWalletResponse> response = childWalletService.getWallets(groupId, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/child-wallets/{walletId}")
    public ResponseEntity<ChildWalletResponse> getChildWallet(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @AuthenticationPrincipal User currentUser) {
        ChildWalletResponse response = childWalletService.getWallet(groupId, walletId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{groupId}/child-wallets/{walletId}")
    public ResponseEntity<ChildWalletResponse> updateChildWallet(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody UpdateChildWalletRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChildWalletResponse response = childWalletService.updateWallet(groupId, walletId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/child-wallets/{walletId}")
    public ResponseEntity<Void> deleteChildWallet(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @AuthenticationPrincipal User currentUser) {
        childWalletService.deleteWallet(groupId, walletId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/deposit")
    public ResponseEntity<ChildWalletResponse> depositToWallet(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody DepositWalletRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChildWalletResponse response = childWalletService.deposit(groupId, walletId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/withdraw")
    public ResponseEntity<ChildWalletResponse> withdrawFromWallet(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody WithdrawWalletRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChildWalletResponse response = childWalletService.withdraw(groupId, walletId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    // ============================================================
    // 7. SPEND REQUESTS (5 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/child-wallets/{walletId}/spend-requests")
    public ResponseEntity<SpendRequestResponse> createSpendRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody CreateSpendRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        SpendRequestResponse response = childManagementService.createSpendRequest(
                groupId, walletId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/child-wallets/{walletId}/spend-requests")
    public ResponseEntity<Page<SpendRequestResponse>> getSpendRequests(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @RequestParam(required = false) SpendRequestStatus status,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<SpendRequestResponse> response = childManagementService.getSpendRequests(
                groupId, walletId, status, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}/approve")
    public ResponseEntity<SpendRequestResponse> approveSpendRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID requestId,
            @Valid @RequestBody ApproveSpendRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        SpendRequestResponse response = childManagementService.approveSpendRequest(
                groupId, walletId, requestId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}/reject")
    public ResponseEntity<SpendRequestResponse> rejectSpendRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID requestId,
            @Valid @RequestBody RejectSpendRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        SpendRequestResponse response = childManagementService.rejectSpendRequest(
                groupId, walletId, requestId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/child-wallets/{walletId}/spend-requests/{requestId}")
    public ResponseEntity<Void> cancelSpendRequest(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User currentUser) {
        childManagementService.cancelSpendRequest(groupId, walletId, requestId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // 8. CHORES (6 endpoints)
    // ============================================================

    @PostMapping("/{groupId}/child-wallets/{walletId}/chores")
    public ResponseEntity<ChoreResponse> createChore(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @Valid @RequestBody CreateChoreRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChoreResponse response = childManagementService.createChore(groupId, walletId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{groupId}/child-wallets/{walletId}/chores")
    public ResponseEntity<Page<ChoreResponse>> getChores(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @RequestParam(required = false) ChoreStatus status,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<ChoreResponse> response = childManagementService.getChores(
                groupId, walletId, status, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/chores/{choreId}/complete")
    public ResponseEntity<ChoreResponse> completeChore(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID choreId,
            @Valid @RequestBody CompleteChoreRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChoreResponse response = childManagementService.completeChore(
                groupId, walletId, choreId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/chores/{choreId}/approve")
    public ResponseEntity<ChoreResponse> approveChore(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID choreId,
            @Valid @RequestBody ApproveChoreRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChoreResponse response = childManagementService.approveChore(
                groupId, walletId, choreId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/child-wallets/{walletId}/chores/{choreId}/reject")
    public ResponseEntity<ChoreResponse> rejectChore(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID choreId,
            @Valid @RequestBody RejectChoreRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChoreResponse response = childManagementService.rejectChore(
                groupId, walletId, choreId, request, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/child-wallets/{walletId}/chores/{choreId}")
    public ResponseEntity<Void> deleteChore(
            @PathVariable UUID groupId,
            @PathVariable UUID walletId,
            @PathVariable UUID choreId,
            @AuthenticationPrincipal User currentUser) {
        childManagementService.deleteChore(groupId, walletId, choreId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // 9. ACTIVITIES & STATISTICS (3 endpoints)
    // ============================================================

    @GetMapping("/{groupId}/activities")
    public ResponseEntity<Page<ActivityResponse>> getActivities(
            @PathVariable UUID groupId,
            @RequestParam(required = false) ActivityType activityType,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<ActivityResponse> response = activityService.getActivities(
                groupId, activityType, userId, startDate, endDate, pageable, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/activities/{activityId}")
    public ResponseEntity<ActivityResponse> getActivity(
            @PathVariable UUID groupId,
            @PathVariable UUID activityId,
            @AuthenticationPrincipal User currentUser) {
        ActivityResponse response = activityService.getActivity(groupId, activityId, currentUser.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{groupId}/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User currentUser) {
        Map<String, Object> response = activityService.getStatistics(groupId, currentUser.getId());
        return ResponseEntity.ok(response);
    }
}
