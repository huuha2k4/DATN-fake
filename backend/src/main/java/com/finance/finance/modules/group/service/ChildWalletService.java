package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.CreateChildWalletRequest;
import com.finance.finance.modules.group.dto.request.DepositWalletRequest;
import com.finance.finance.modules.group.dto.request.UpdateChildWalletRequest;
import com.finance.finance.modules.group.dto.request.WithdrawWalletRequest;
import com.finance.finance.modules.group.dto.response.ChildWalletResponse;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.entity.GroupMemberId;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChildWalletService {

    private final ChildWalletRepository walletRepository;
    private final ChildSpendRequestRepository spendRequestRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ChildWalletResponse createWallet(UUID groupId, CreateChildWalletRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        UUID childUserId = null;
        String childUsername = null;

        // If parent provided login credentials for child (Mode 2)
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            childUsername = request.getUsername().trim().toLowerCase();
            if (userRepository.existsByUsernameAndDeletedAtIsNull(childUsername)) {
                throw new BusinessException("Tên đăng nhập của bé '" + childUsername + "' đã tồn tại");
            }
            if (request.getPassword() == null || request.getPassword().length() < 6) {
                throw new BusinessException("Mật khẩu cho bé tối thiểu 6 ký tự");
            }

            String childEmail = childUsername + "@finora.kids";
            if (userRepository.existsByEmailAndDeletedAtIsNull(childEmail)) {
                childEmail = childUsername + "_" + System.currentTimeMillis() + "@finora.kids";
            }

            User childUser = new User();
            childUser.setUsername(childUsername);
            childUser.setEmail(childEmail);
            childUser.setFullName(request.getChildName());
            childUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            childUser.setSystemRole(SystemRole.USER);
            childUser.setUserStatus(UserStatus.ACTIVE);
            childUser.setPreferredCurrency("VND");
            childUser.setTimezone("Asia/Ho_Chi_Minh");
            childUser.setLanguage("vi-VN");
            childUser.setAvatarUrl("/default-avatar.png");
            childUser = userRepository.save(childUser);
            childUserId = childUser.getId();

            // Add child to group members as MEMBER
            GroupMember childMember = GroupMember.builder()
                    .groupId(groupId)
                    .userId(childUserId)
                    .role(MemberRole.MEMBER)
                    .joinedAt(LocalDateTime.now())
                    .build();
            groupMemberRepository.save(childMember);
            log.info("Created child user {} for wallet in group {}", childUsername, groupId);
        }

        BigDecimal initialBal = request.getBalance() != null ? request.getBalance() : BigDecimal.ZERO;

        ChildWallet wallet = ChildWallet.builder()
                .groupId(groupId)
                .userId(childUserId)
                .childUsername(childUsername)
                .childName(request.getChildName())
                .dateOfBirth(request.getDateOfBirth())
                .currency("VND")
                .balance(initialBal)
                .weeklyAllowance(request.getWeeklyAllowance())
                .privacyLevel(request.getPrivacyLevel() != null ? request.getPrivacyLevel() : com.finance.finance.common.enums.PrivacyLevel.PARENT_SUPERVISED)
                .spendLimitDaily(request.getSpendLimitDaily())
                .spendLimitWeekly(request.getSpendLimitWeekly())
                .allowedCategories(null)
                .requireApprovalAbove(request.getRequireApprovalAbove())
                .settings(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .version(0L)
                .build();

        wallet = walletRepository.save(wallet);
        return buildWalletResponse(wallet);
    }

    @Transactional(readOnly = true)
    public Page<ChildWalletResponse> getWallets(UUID groupId, Pageable pageable, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        List<ChildWallet> wallets = walletRepository.findByGroupId(groupId);
        return new org.springframework.data.domain.PageImpl<>(
                wallets.stream().map(this::buildWalletResponse).collect(java.util.stream.Collectors.toList()),
                pageable,
                wallets.size()
        );
    }

    @Transactional(readOnly = true)
    public ChildWalletResponse getWallet(UUID groupId, UUID walletId, UUID currentUserId) {
        // Validate user is member
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        return buildWalletResponse(wallet);
    }

    @Transactional
    public ChildWalletResponse updateWallet(UUID groupId, UUID walletId, UpdateChildWalletRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        // Update fields
        if (request.getChildName() != null) {
            wallet.setChildName(request.getChildName());
        }
        if (request.getDateOfBirth() != null) {
            wallet.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getPrivacyLevel() != null) {
            wallet.setPrivacyLevel(request.getPrivacyLevel());
        }
        if (request.getSpendLimitDaily() != null) {
            wallet.setSpendLimitDaily(request.getSpendLimitDaily());
        }
        if (request.getSpendLimitWeekly() != null) {
            wallet.setSpendLimitWeekly(request.getSpendLimitWeekly());
        }
        if (request.getAllowedCategories() != null) {
            wallet.setAllowedCategories(null); // TODO: Serialize to JSON
        }
        if (request.getRequireApprovalAbove() != null) {
            wallet.setRequireApprovalAbove(request.getRequireApprovalAbove());
        }
        if (request.getSettings() != null) {
            wallet.setSettings(null); // TODO: Serialize to JSON
        }

        wallet.setUpdatedAt(LocalDateTime.now());
        wallet = walletRepository.save(wallet);

        return buildWalletResponse(wallet);
    }

    @Transactional
    public void deleteWallet(UUID groupId, UUID walletId, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        // Check if wallet has balance
        if (wallet.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalStateException("Cannot delete wallet with remaining balance");
        }

        walletRepository.delete(wallet);
    }

    @Transactional
    public ChildWalletResponse deposit(UUID groupId, UUID walletId, DepositWalletRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        // Add to balance
        wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        wallet = walletRepository.save(wallet);

        // TODO: Log activity

        return buildWalletResponse(wallet);
    }

    @Transactional
    public ChildWalletResponse withdraw(UUID groupId, UUID walletId, WithdrawWalletRequest request, UUID currentUserId) {
        // Validate user is admin or owner
        validateAdminOrOwner(groupId, currentUserId);

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        // Check sufficient balance
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalStateException("Insufficient balance");
        }

        // Deduct from balance
        wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        wallet = walletRepository.save(wallet);

        // TODO: Log activity

        return buildWalletResponse(wallet);
    }

    private void validateAdminOrOwner(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findById(new GroupMemberId(groupId, userId))
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this group"));

        if (member.getRole() != MemberRole.OWNER && member.getRole() != MemberRole.ADMIN) {
            throw new ResourceNotFoundException("Only admins and owners can manage child wallets");
        }
    }

    private ChildWalletResponse buildWalletResponse(ChildWallet wallet) {
        // Calculate stats
        long totalRequests = spendRequestRepository.countByWalletId(wallet.getId());
        long pendingRequests = spendRequestRepository.countPendingByWalletId(wallet.getId());

        return ChildWalletResponse.builder()
                .id(wallet.getId())
                .groupId(wallet.getGroupId())
                .userId(wallet.getUserId())
                .childUsername(wallet.getChildUsername())
                .childName(wallet.getChildName())
                .dateOfBirth(wallet.getDateOfBirth())
                .currency(wallet.getCurrency() != null ? wallet.getCurrency() : "VND")
                .balance(wallet.getBalance())
                .privacyLevel(wallet.getPrivacyLevel() != null ? wallet.getPrivacyLevel().name() : "PARENT_SUPERVISED")
                .spendLimitDaily(wallet.getSpendLimitDaily())
                .spendLimitWeekly(wallet.getSpendLimitWeekly())
                .allowedCategories(null) // TODO: Deserialize from JSON
                .requireApprovalAbove(wallet.getRequireApprovalAbove())
                .settings(null) // TODO: Deserialize from JSON
                .stats(ChildWalletResponse.WalletStats.builder()
                        .pendingRequestCount((int) pendingRequests)
                        .build())
                .createdAt(wallet.getCreatedAt())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }
}
