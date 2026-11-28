package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.SettlementStatus;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.group.dto.request.CreateSettlementRequest;
import com.finance.finance.modules.group.dto.request.RejectSettlementRequest;
import com.finance.finance.modules.group.dto.request.ConfirmSettlementRequest;
import com.finance.finance.modules.group.dto.response.SettlementResponse;
import com.finance.finance.modules.group.entity.GroupSettlement;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.group.repository.GroupSettlementRepository;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.common.enums.TransactionType;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupSettlementService {

    private final GroupSettlementRepository groupSettlementRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRepository groupRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionService transactionService;
    private final GroupExpenseService groupExpenseService;
    private final GroupFinanceNotifications financeNotifications;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemAuditService systemAuditService;

    @Transactional
    public SettlementResponse createSettlement(UUID groupId, CreateSettlementRequest request, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        if (request.getToUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("Không thể thanh toán cho chính mình");
        }
        validateMemberAccess(groupId, request.getToUserId());

        var sourceAccount = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nguồn"));
        var group = groupRepository.findByIdAndNotDeleted(groupId).orElseThrow();
        if (!group.getBaseCurrency().equalsIgnoreCase(sourceAccount.getCurrencyCode())) {
            throw new IllegalArgumentException("Ví nguồn phải cùng loại tiền với nhóm");
        }
        if ("VND".equalsIgnoreCase(group.getBaseCurrency()) && request.getAmount().stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Số tiền VND phải là số nguyên");
        }
        validateCurrentDebt(groupId, currentUserId, request.getToUserId(), request.getAmount(), currentUserId);
        GroupSettlement settlement = GroupSettlement.builder()
                .groupId(groupId)
                .fromUserId(currentUserId)
                .toUserId(request.getToUserId())
                .fromAccountId(sourceAccount.getId())
                .amount(request.getAmount())
                .currency(sourceAccount.getCurrencyCode())
                .paymentMethod(request.getPaymentMethod())
                .settlementDate(request.getSettlementDate())
                .notes(request.getNotes())
                .proofKey(request.getProofKey())
                .status(SettlementStatus.PENDING)
                .build();

        settlement = groupSettlementRepository.save(settlement);
        notifySettlement(settlement, settlement.getToUserId(), "pending", "Yêu cầu thanh toán công nợ");
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.GROUP_SETTLEMENT_CREATED)
                    .actorId(currentUserId)
                    .subjectUserId(settlement.getToUserId())
                    .groupId(groupId)
                    .resourceType("GROUP_SETTLEMENT")
                    .resourceId(settlement.getId())
                    .newValues(java.util.Map.of("amount", settlement.getAmount()))
                    .build());
        }
        return buildSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public Page<SettlementResponse> getSettlements(UUID groupId, String statusStr, 
                                                     Pageable pageable, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        Page<GroupSettlement> settlements;
        if (statusStr != null && !statusStr.isEmpty()) {
            SettlementStatus status = SettlementStatus.valueOf(statusStr.toUpperCase());
            settlements = groupSettlementRepository.findByGroupIdAndStatus(groupId, status, pageable);
        } else {
            settlements = groupSettlementRepository.findByGroupId(groupId, pageable);
        }

        return settlements.map(this::buildSettlementResponse);
    }

    @Transactional
    public SettlementResponse confirmSettlement(UUID groupId, UUID settlementId, ConfirmSettlementRequest request, UUID currentUserId) {
        groupRepository.findByIdForUpdate(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        GroupSettlement settlement = groupSettlementRepository.findLockedByIdAndGroupId(settlementId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
        
        if (!settlement.getToUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Only the receiver can confirm the settlement");
        }
        if (settlement.getStatus() == SettlementStatus.CONFIRMED) return buildSettlementResponse(settlement);
        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new IllegalStateException("Khoản thanh toán không còn chờ xác nhận");
        }
        validateCurrentDebt(groupId, settlement.getFromUserId(), settlement.getToUserId(), settlement.getAmount(), currentUserId);

        var receivingAccount = accountRepository.findByIdAndUserId(request.getReceivingAccountId(), currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nhận"));
        var sourceAccount = accountRepository.findByIdAndUserId(settlement.getFromAccountId(), settlement.getFromUserId())
                .orElseThrow(() -> new IllegalStateException("Ví nguồn thanh toán không còn hợp lệ"));
        if (!sourceAccount.getCurrencyCode().equalsIgnoreCase(receivingAccount.getCurrencyCode())) {
            throw new IllegalArgumentException("Ví gửi và ví nhận phải cùng loại tiền");
        }
        UUID expenseCategory = categoryRepository.findByCode("OTHER_EXPENSE")
                .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống")).getId();
        UUID outgoingId = settlement.getOutgoingTransactionId();
        // Legacy pending settlements already posted an outgoing entry.
        if (outgoingId == null) outgoingId = transactionService.createTransaction(settlement.getFromUserId(), CreateTransactionRequest.builder()
                .transactionType(TransactionType.EXPENSE).accountId(sourceAccount.getId()).categoryId(expenseCategory)
                .amount(settlement.getAmount()).currencyCode(sourceAccount.getCurrencyCode())
                .transactionDate(settlement.getSettlementDate()).description("Thanh toán công nợ nhóm")
                .note(settlement.getNotes()).isExcludedFromReport(true).build()).getId();
        UUID incomeCategory = categoryRepository.findByCode("OTHER_INCOME").filter(category -> !category.isDeleted())
                .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống")).getId();
        var incoming = transactionService.createTransaction(currentUserId, CreateTransactionRequest.builder()
                .transactionType(TransactionType.INCOME).accountId(receivingAccount.getId()).categoryId(incomeCategory)
                .amount(settlement.getAmount()).currencyCode(receivingAccount.getCurrencyCode()).transactionDate(settlement.getSettlementDate())
                .description("Nhận thanh toán công nợ nhóm").note(settlement.getNotes()).isExcludedFromReport(true).build());
        settlement.setOutgoingTransactionId(outgoingId);
        settlement.setToAccountId(receivingAccount.getId());
        settlement.setIncomingTransactionId(incoming.getId());
        settlement.setStatus(SettlementStatus.CONFIRMED);
        settlement.setConfirmedAt(LocalDateTime.now());
        settlement = groupSettlementRepository.save(settlement);
        notifySettlement(settlement, settlement.getFromUserId(), "confirmed", "Thanh toán đã được xác nhận");
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.GROUP_SETTLEMENT_CONFIRMED)
                    .actorId(currentUserId)
                    .subjectUserId(settlement.getFromUserId())
                    .groupId(groupId)
                    .resourceType("GROUP_SETTLEMENT")
                    .resourceId(settlement.getId())
                    .relatedResourceId(incoming.getId())
                    .newValues(java.util.Map.of("amount", settlement.getAmount(), "status", settlement.getStatus().name()))
                    .build());
        }

        return buildSettlementResponse(settlement);
    }

    @Transactional
    public SettlementResponse rejectSettlement(UUID groupId, UUID settlementId, 
                                                RejectSettlementRequest request, UUID currentUserId) {
        GroupSettlement settlement = groupSettlementRepository.findLockedByIdAndGroupId(settlementId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
        
        if (!settlement.getToUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Only the receiver can reject the settlement");
        }
        if (settlement.getStatus() != SettlementStatus.PENDING) {
            throw new IllegalStateException("Khoản thanh toán không còn chờ xác nhận");
        }

        settlement.setStatus(SettlementStatus.REJECTED);
        settlement.setRejectedAt(LocalDateTime.now());
        settlement.setRejectionReason(request.getReason());
        notifySettlement(settlement, settlement.getFromUserId(), "rejected", "Thanh toán bị từ chối");
        settlement = groupSettlementRepository.save(settlement);

        return buildSettlementResponse(settlement);
    }

    private GroupSettlement findSettlementOrThrow(UUID settlementId) {
        return groupSettlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
    }

    @Transactional
    public SettlementResponse cancelSettlement(UUID groupId, UUID settlementId, UUID actorId) {
        validateMemberAccess(groupId, actorId);
        var settlement = groupSettlementRepository.findLockedByIdAndGroupId(settlementId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
        if (!actorId.equals(settlement.getFromUserId())) throw new SecurityException("Chỉ người gửi được hủy yêu cầu");
        if (settlement.getStatus() == SettlementStatus.CANCELLED) return buildSettlementResponse(settlement);
        if (settlement.getStatus() != SettlementStatus.PENDING || settlement.getOutgoingTransactionId() != null) {
            throw new IllegalStateException("Chỉ hủy yêu cầu đang chờ và chưa ghi nhận bút toán ví");
        }
        settlement.setStatus(SettlementStatus.CANCELLED);
        settlement.setCancelledAt(LocalDateTime.now());
        return buildSettlementResponse(settlement);
    }

    private void notifySettlement(GroupSettlement settlement, UUID user, String event, String title) {
        financeNotifications.send(settlement.getGroupId(), user, "BALANCES", "settlementId", settlement.getId(),
                event, title, settlement.getAmount().stripTrailingZeros().toPlainString() + " đ");
    }

    private void validateCurrentDebt(UUID groupId, UUID fromUserId, UUID toUserId,
                                     java.math.BigDecimal amount, UUID viewerId) {
        var balances = groupExpenseService.getBalances(groupId, viewerId);
        java.math.BigDecimal available = balances.getSimplifiedDebts().stream()
                .filter(debt -> debt.getFromUserId().equals(fromUserId) && debt.getToUserId().equals(toUserId))
                .map(com.finance.finance.modules.group.dto.response.BalanceResponse.SimplifiedDebt::getAmount)
                .findFirst().orElse(java.math.BigDecimal.ZERO);
        if (available.compareTo(amount) < 0) {
            throw new IllegalStateException("Số tiền thanh toán vượt nghĩa vụ hiện tại; vui lòng tải lại phương án bù trừ");
        }
    }

    private void validateMemberAccess(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }
    }

    private SettlementResponse buildSettlementResponse(GroupSettlement settlement) {
        return SettlementResponse.builder()
                .id(settlement.getId())
                .groupId(settlement.getGroupId())
                .fromUserId(settlement.getFromUserId())
                .toUserId(settlement.getToUserId())
                .amount(settlement.getAmount())
                .currency(settlement.getCurrency())
                .paymentMethod(settlement.getPaymentMethod())
                .settlementDate(settlement.getSettlementDate())
                .notes(settlement.getNotes())
                .proofKey(settlement.getProofKey())
                .status(settlement.getStatus().name())
                .createdAt(settlement.getCreatedAt())
                .confirmedAt(settlement.getConfirmedAt())
                .rejectedAt(settlement.getRejectedAt())
                .rejectionReason(settlement.getRejectionReason())
                .build();
    }
}
