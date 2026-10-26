package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.*;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.*;
import com.finance.finance.modules.group.dto.response.ChoreResponse;
import com.finance.finance.modules.group.dto.response.SpendRequestResponse;
import com.finance.finance.modules.group.entity.ChildChore;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.repository.ChildChoreRepository;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChildManagementService {

    private final ChildSpendRequestRepository spendRequestRepository;
    private final ChildChoreRepository choreRepository;
    private final ChildWalletRepository walletRepository;
    private final GroupMemberRepository groupMemberRepository;

    // ============ Spend Requests ============

    @Transactional
    public SpendRequestResponse createSpendRequest(UUID groupId, UUID walletId, CreateSpendRequestRequest request, UUID currentUserId) {
        // Validate wallet exists and belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        // Check if approval is required
        boolean requiresApproval = wallet.getRequireApprovalAbove() != null &&
                request.getAmount().compareTo(wallet.getRequireApprovalAbove()) > 0;

        ChildSpendRequest spendRequest = ChildSpendRequest.builder()
                .walletId(walletId)
                .amount(request.getAmount())
                .categoryId(request.getCategoryId())
                .description(request.getDescription())
                .status(requiresApproval ? SpendRequestStatus.PENDING : SpendRequestStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // If no approval required, process immediately
        if (!requiresApproval) {
            spendRequest.setRespondedByUserId(currentUserId);
            spendRequest.setRespondedAt(LocalDateTime.now());
            
            // Deduct from wallet balance
            if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalStateException("Insufficient balance in child wallet");
            }
            wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
            wallet.setUpdatedAt(LocalDateTime.now());
            walletRepository.save(wallet);

            // TODO: Create actual transaction
        }

        spendRequest = spendRequestRepository.save(spendRequest);
        return buildSpendRequestResponse(spendRequest);
    }

    @Transactional(readOnly = true)
    public Page<SpendRequestResponse> getSpendRequests(UUID groupId, UUID walletId, SpendRequestStatus status, Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        // Validate wallet belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        Page<ChildSpendRequest> requests;
        if (status != null) {
            requests = spendRequestRepository.findByWalletIdAndStatus(walletId, status, pageable);
        } else {
            requests = spendRequestRepository.findByWalletIdOrderByCreatedAtDesc(walletId, pageable);
        }

        return requests.map(this::buildSpendRequestResponse);
    }

    @Transactional
    public SpendRequestResponse approveSpendRequest(UUID groupId, UUID walletId, UUID requestId, 
                                                   ApproveSpendRequestRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildSpendRequest spendRequest = spendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Spend request not found"));

        if (!spendRequest.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Request does not belong to this wallet");
        }

        if (spendRequest.getStatus() != SpendRequestStatus.PENDING) {
            throw new IllegalStateException("Request is not pending");
        }

        // Get wallet
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        // Check sufficient balance
        if (wallet.getBalance().compareTo(spendRequest.getAmount()) < 0) {
            throw new IllegalStateException("Insufficient balance in child wallet");
        }

        // Deduct from wallet
        wallet.setBalance(wallet.getBalance().subtract(spendRequest.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Update request
        spendRequest.setStatus(SpendRequestStatus.APPROVED);
        spendRequest.setRespondedByUserId(currentUserId);
        spendRequest.setRespondedAt(LocalDateTime.now());
        spendRequest.setUpdatedAt(LocalDateTime.now());

        // TODO: Create actual transaction with transactionId from request

        spendRequest = spendRequestRepository.save(spendRequest);
        return buildSpendRequestResponse(spendRequest);
    }

    @Transactional
    public SpendRequestResponse rejectSpendRequest(UUID groupId, UUID walletId, UUID requestId, 
                                                  RejectSpendRequestRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildSpendRequest spendRequest = spendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Spend request not found"));

        if (!spendRequest.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Request does not belong to this wallet");
        }

        if (spendRequest.getStatus() != SpendRequestStatus.PENDING) {
            throw new IllegalStateException("Request is not pending");
        }

        spendRequest.setStatus(SpendRequestStatus.REJECTED);
        spendRequest.setRespondedByUserId(currentUserId);
        spendRequest.setRespondedAt(LocalDateTime.now());
        spendRequest.setUpdatedAt(LocalDateTime.now());

        spendRequest = spendRequestRepository.save(spendRequest);
        return buildSpendRequestResponse(spendRequest);
    }

    @Transactional
    public void cancelSpendRequest(UUID groupId, UUID walletId, UUID requestId, UUID currentUserId) {
        // Validate wallet belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        ChildSpendRequest spendRequest = spendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Spend request not found"));

        if (!spendRequest.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Request does not belong to this wallet");
        }

        if (spendRequest.getStatus() != SpendRequestStatus.PENDING) {
            throw new IllegalStateException("Can only cancel pending requests");
        }

        spendRequest.setStatus(SpendRequestStatus.CANCELLED);
        spendRequest.setUpdatedAt(LocalDateTime.now());
        spendRequestRepository.save(spendRequest);
    }

    // ============ Chores ============

    @Transactional
    public ChoreResponse createChore(UUID groupId, UUID walletId, CreateChoreRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        // Validate wallet belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        ChildChore chore = ChildChore.builder()
                .walletId(walletId)
                .title(request.getTitle())
                .description(request.getDescription())
                .rewardAmount(request.getRewardAmount())
                .frequency(request.getFrequency())
                .difficulty(request.getDifficulty())
                .dueDate(request.getDueDate())
                .status(ChoreStatus.ASSIGNED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        chore = choreRepository.save(chore);
        return buildChoreResponse(chore);
    }

    @Transactional(readOnly = true)
    public Page<ChoreResponse> getChores(UUID groupId, UUID walletId, ChoreStatus status, Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        // Validate wallet belongs to group
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        Page<ChildChore> chores;
        if (status != null) {
            chores = choreRepository.findByWalletIdAndStatus(walletId, status, pageable);
        } else {
            chores = choreRepository.findByWalletIdOrderByCreatedAtDesc(walletId, pageable);
        }

        return chores.map(this::buildChoreResponse);
    }

    @Transactional
    public ChoreResponse completeChore(UUID groupId, UUID walletId, UUID choreId, CompleteChoreRequest request, UUID currentUserId) {
        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        if (chore.getStatus() != ChoreStatus.ASSIGNED && chore.getStatus() != ChoreStatus.IN_PROGRESS) {
            throw new IllegalStateException("Chore cannot be completed in current status");
        }

        chore.setStatus(ChoreStatus.SUBMITTED);
        chore.setCompletedAt(LocalDateTime.now());
        chore.setProofImageKey(request.getProofImageKey());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);
        return buildChoreResponse(chore);
    }

    @Transactional
    public ChoreResponse approveChore(UUID groupId, UUID walletId, UUID choreId, ApproveChoreRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        if (chore.getStatus() != ChoreStatus.SUBMITTED) {
            throw new IllegalStateException("Chore must be submitted before approval");
        }

        // Get wallet and add reward
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        wallet.setBalance(wallet.getBalance().add(chore.getRewardAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Update chore
        chore.setStatus(ChoreStatus.APPROVED);
        chore.setApprovedByUserId(currentUserId);
        chore.setApprovedAt(LocalDateTime.now());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);

        // TODO: Log activity

        return buildChoreResponse(chore);
    }

    @Transactional
    public ChoreResponse rejectChore(UUID groupId, UUID walletId, UUID choreId, RejectChoreRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        if (chore.getStatus() != ChoreStatus.SUBMITTED) {
            throw new IllegalStateException("Chore must be submitted before rejection");
        }

        chore.setStatus(ChoreStatus.REJECTED);
        chore.setApprovedByUserId(currentUserId);
        chore.setApprovedAt(LocalDateTime.now());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);
        return buildChoreResponse(chore);
    }

    @Transactional
    public void deleteChore(UUID groupId, UUID walletId, UUID choreId, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        choreRepository.delete(chore);
    }

    // ============ Helper Methods ============

    private void validateAdminOrOwner(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_IdAndRoleIn(
                groupId, userId, java.util.Arrays.asList(MemberRole.OWNER, MemberRole.ADMIN))) {
            throw new ResourceNotFoundException("Only admins and owners can perform this action");
        }
    }

    private SpendRequestResponse buildSpendRequestResponse(ChildSpendRequest request) {
        return SpendRequestResponse.builder()
                .id(request.getId())
                .walletId(request.getWalletId())
                .amount(request.getAmount())
                .categoryId(request.getCategoryId())
                .description(request.getDescription())
                .status(request.getStatus().name())
                .respondedByUserId(request.getRespondedByUserId())
                .respondedAt(request.getRespondedAt())
                .transactionId(request.getTransactionId())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private ChoreResponse buildChoreResponse(ChildChore chore) {
        return ChoreResponse.builder()
                .id(chore.getId())
                .walletId(chore.getWalletId())
                .title(chore.getTitle())
                .description(chore.getDescription())
                .rewardAmount(chore.getRewardAmount())
                .frequency(chore.getFrequency().name())
                .difficulty(chore.getDifficulty() != null ? chore.getDifficulty().name() : null)
                .dueDate(chore.getDueDate())
                .status(chore.getStatus().name())
                .completedAt(chore.getCompletedAt())
                .proofImageKey(chore.getProofImageKey())
                .approvedByUserId(chore.getApprovedByUserId())
                .approvedAt(chore.getApprovedAt())
                .createdAt(chore.getCreatedAt())
                .updatedAt(chore.getUpdatedAt())
                .build();
    }
}
