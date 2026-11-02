package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.TransactionSource;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.entity.Group;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import com.finance.finance.modules.group.dto.request.CreateChildWalletRequest;
import com.finance.finance.modules.group.dto.request.DepositWalletRequest;
import com.finance.finance.modules.group.dto.request.UpdateChildWalletRequest;
import com.finance.finance.modules.group.dto.request.WithdrawWalletRequest;
import com.finance.finance.modules.group.dto.response.ChildWalletResponse;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.entity.GroupMemberId;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.NotificationPriority;
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
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final GroupFundRepository groupFundRepository;
    private final GroupExpenseRepository groupExpenseRepository;
    private final GroupRepository groupRepository;

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
                .allowanceSource(request.getAllowanceSource() != null ? request.getAllowanceSource() : "PERSONAL_ACCOUNT")
                .allowanceAccountId(request.getAllowanceAccountId())
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
        if (request.getWeeklyAllowance() != null) {
            wallet.setWeeklyAllowance(request.getWeeklyAllowance());
        }
        if (request.getAllowanceSource() != null) {
            wallet.setAllowanceSource(request.getAllowanceSource());
        }
        if (request.getAllowanceAccountId() != null) {
            wallet.setAllowanceAccountId(request.getAllowanceAccountId());
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

        // Hoàn tiền còn dư (nếu có) về nguồn tiền nạp nếu cần, hoặc cho phép xóa kèm xóa các liên kết
        UUID childUserId = wallet.getUserId();

        walletRepository.delete(wallet);

        // Nếu bé có tài khoản độc lập trong nhóm, có thể xóa quyền thành viên nhóm
        if (childUserId != null) {
            try {
                groupMemberRepository.deleteById(new GroupMemberId(groupId, childUserId));
            } catch (Exception ignored) {
            }
        }
    }

    @Transactional
    public ChildWalletResponse deposit(UUID groupId, UUID walletId, DepositWalletRequest request, UUID currentUserId) {
        // Mọi thành viên trong gia đình đều có thể nạp tiền cho bé
        validateMember(groupId, currentUserId);

        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }

        String source = request.getSource() != null ? request.getSource() : "allowance";
        String note = request.getDescription() != null && !request.getDescription().trim().isEmpty()
                ? request.getDescription().trim()
                : "Nạp tiền cho ví bé: " + wallet.getChildName();

        // Xử lý trừ tiền từ nguồn thực tế và lưu vết lịch sử giao dịch
        if ("GROUP_FUND".equalsIgnoreCase(source)) {
            GroupFund fund = groupFundRepository.findByGroupId(groupId)
                    .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
            if (fund.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalArgumentException("Số dư quỹ nhóm không đủ để cấp cho bé");
            }
            fund.setBalance(fund.getBalance().subtract(request.getAmount()));
            groupFundRepository.save(fund);

            // Ghi nhận khoản chi của quỹ nhóm thuộc danh mục "Gia đình & Con cái" (FAMILY)
            UUID categoryId = categoryRepository.findByCode("FAMILY")
                    .map(Category::getId)
                    .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                            .stream().findFirst().map(Category::getId).orElse(null));

            GroupExpense expense = GroupExpense.builder()
                    .groupId(groupId)
                    .description("Cấp tiền ví bé (" + wallet.getChildName() + "): " + note)
                    .amount(request.getAmount())
                    .currency("VND")
                    .paidByUserId(currentUserId)
                    .createdByUserId(currentUserId)
                    .paymentSource("GROUP_FUND")
                    .categoryId(categoryId)
                    .splitMethod(com.finance.finance.common.enums.SplitMethod.EQUAL)
                    .expenseDate(LocalDateTime.now().toLocalDate())
                    .build();
            groupExpenseRepository.save(expense);
        } else if ("PERSONAL_ACCOUNT".equalsIgnoreCase(source) || request.getSourceAccountId() != null) {
            if (request.getSourceAccountId() == null) {
                throw new IllegalArgumentException("Vui lòng chọn ví cá nhân để trừ tiền nạp cho bé");
            }
            Account parentAccount = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví cá nhân của bạn"));

            if (parentAccount.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalStateException("Số dư ví cá nhân không đủ để nạp cho bé");
            }

            parentAccount.setBalance(parentAccount.getBalance().subtract(request.getAmount()));
            accountRepository.save(parentAccount);

            // Ghi nhận giao dịch chi tiêu của bố mẹ thuộc danh mục "Gia đình & Con cái" (FAMILY)
            UUID categoryId = categoryRepository.findByCode("FAMILY")
                    .map(Category::getId)
                    .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                            .stream().findFirst().map(Category::getId).orElse(null));

            Transaction parentTx = Transaction.builder()
                    .userId(currentUserId)
                    .accountId(parentAccount.getId())
                    .categoryId(categoryId)
                    .type(TransactionType.EXPENSE)
                    .amount(request.getAmount())
                    .currencyCode(parentAccount.getCurrencyCode())
                    .exchangeRate(BigDecimal.ONE)
                    .baseAmount(request.getAmount())
                    .occurredAt(java.time.Instant.now())
                    .occurredDate(java.time.LocalDate.now())
                    .descriptionRaw("Nạp tiền ví bé (" + wallet.getChildName() + "): " + note)
                    .source(TransactionSource.MANUAL)
                    .build();
            transactionRepository.save(parentTx);
        }

        // Add to balance
        wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        wallet = walletRepository.save(wallet);

        // Ghi lại lịch sử nạp tiền vào ví bé (ChildSpendRequest dạng THU NHẬP [INCOME_DEPOSIT])
        UUID childIncomeCategory = categoryRepository.findByCode("FAMILY")
                .map(Category::getId)
                .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                        .stream().findFirst().map(Category::getId).orElse(null));

        ChildSpendRequest depositRecord = ChildSpendRequest.builder()
                .walletId(walletId)
                .amount(request.getAmount())
                .categoryId(childIncomeCategory)
                .description("[INCOME_DEPOSIT] " + note)
                .status(com.finance.finance.common.enums.SpendRequestStatus.APPROVED)
                .respondedByUserId(currentUserId)
                .respondedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        spendRequestRepository.save(depositRecord);

        // Notify child if child has an account
        if (wallet.getUserId() != null) {
            try {
                String senderName = userRepository.findById(currentUserId)
                        .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                        .orElse("Phụ huynh");
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_MONEY_RECEIVED,
                        NotificationPriority.HIGH,
                        "Bạn vừa được cộng tiền vào ví! 🎉",
                        senderName + " đã nạp cho bạn " + String.format("%,d", request.getAmount().longValue()) + "đ (" + note + ").",
                        "/child-wallet",
                        "Xem ví của em"
                );
            } catch (Exception e) {
                log.warn("Failed to send child deposit notification: {}", e.getMessage());
            }
        }

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

    private void validateMember(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }
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

        Integer age = null;
        if (wallet.getDateOfBirth() != null) {
            age = java.time.Period.between(wallet.getDateOfBirth(), java.time.LocalDate.now()).getYears();
        }

        return ChildWalletResponse.builder()
                .id(wallet.getId())
                .groupId(wallet.getGroupId())
                .userId(wallet.getUserId())
                .childUsername(wallet.getChildUsername())
                .childName(wallet.getChildName())
                .dateOfBirth(wallet.getDateOfBirth())
                .age(age)
                .currency(wallet.getCurrency() != null ? wallet.getCurrency() : "VND")
                .balance(wallet.getBalance())
                .weeklyAllowance(wallet.getWeeklyAllowance())
                .allowanceSource(wallet.getAllowanceSource())
                .allowanceAccountId(wallet.getAllowanceAccountId())
                .nextAllowanceDate(wallet.getNextAllowanceDate())
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
