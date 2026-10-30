package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.SettlementStatus;
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

    @Transactional
    public SettlementResponse createSettlement(UUID groupId, CreateSettlementRequest request, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        var sourceAccount = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nguồn"));
        UUID expenseCategory = categoryRepository.findByCode("OTHER_EXPENSE")
                .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống")).getId();
        var outgoing = transactionService.createTransaction(currentUserId, CreateTransactionRequest.builder()
                .transactionType(TransactionType.EXPENSE).accountId(sourceAccount.getId()).categoryId(expenseCategory)
                .amount(request.getAmount()).currencyCode(sourceAccount.getCurrencyCode()).transactionDate(request.getSettlementDate())
                .description("Bù trừ nhóm").note(request.getNotes()).isExcludedFromReport(true).build());
        GroupSettlement settlement = GroupSettlement.builder()
                .groupId(groupId)
                .fromUserId(currentUserId)
                .toUserId(request.getToUserId())
                .fromAccountId(sourceAccount.getId()).outgoingTransactionId(outgoing.getId())
                .amount(request.getAmount())
                .currency("VND")
                .paymentMethod(request.getPaymentMethod())
                .settlementDate(request.getSettlementDate())
                .notes(request.getNotes())
                .proofKey(request.getProofKey())
                .status(SettlementStatus.PENDING)
                .build();

        settlement = groupSettlementRepository.save(settlement);
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
        GroupSettlement settlement = findSettlementOrThrow(settlementId);
        
        if (!settlement.getToUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Only the receiver can confirm the settlement");
        }

        var receivingAccount = accountRepository.findByIdAndUserId(request.getReceivingAccountId(), currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nhận"));
        UUID incomeCategory = categoryRepository.findByCode("OTHER_INCOME_SYS")
                .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống")).getId();
        var incoming = transactionService.createTransaction(currentUserId, CreateTransactionRequest.builder()
                .transactionType(TransactionType.INCOME).accountId(receivingAccount.getId()).categoryId(incomeCategory)
                .amount(settlement.getAmount()).currencyCode(receivingAccount.getCurrencyCode()).transactionDate(settlement.getSettlementDate())
                .description("Nhận bù trừ nhóm").note(settlement.getNotes()).isExcludedFromReport(true).build());
        settlement.setToAccountId(receivingAccount.getId());
        settlement.setIncomingTransactionId(incoming.getId());
        settlement.setStatus(SettlementStatus.CONFIRMED);
        settlement.setConfirmedAt(LocalDateTime.now());
        settlement = groupSettlementRepository.save(settlement);

        return buildSettlementResponse(settlement);
    }

    @Transactional
    public SettlementResponse rejectSettlement(UUID groupId, UUID settlementId, 
                                                RejectSettlementRequest request, UUID currentUserId) {
        GroupSettlement settlement = findSettlementOrThrow(settlementId);
        
        if (!settlement.getToUserId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Only the receiver can reject the settlement");
        }

        settlement.setStatus(SettlementStatus.REJECTED);
        settlement.setRejectedAt(LocalDateTime.now());
        settlement.setRejectionReason(request.getReason());
        settlement = groupSettlementRepository.save(settlement);

        return buildSettlementResponse(settlement);
    }

    private GroupSettlement findSettlementOrThrow(UUID settlementId) {
        return groupSettlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
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
