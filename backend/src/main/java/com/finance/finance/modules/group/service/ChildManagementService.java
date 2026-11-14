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
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.common.enums.TransactionSource;
import com.finance.finance.modules.group.dto.request.CreateMoneyRequest;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.SplitMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChildManagementService {

    private final ChildSpendRequestRepository spendRequestRepository;
    private final ChildChoreRepository choreRepository;
    private final ChildWalletRepository walletRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRepository groupRepository;
    private final CategoryRepository categoryRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final GroupFundRepository groupFundRepository;
    private final GroupExpenseRepository groupExpenseRepository;
    private final com.finance.finance.modules.user.repository.UserRepository userRepository;
    private final NotificationService notificationService;

    // ============ Spend Requests ============

    private static final String MONEY_REQUEST_PREFIX = "[MONEY_REQUEST] ";

    @Transactional
    public SpendRequestResponse createMoneyRequest(UUID groupId, UUID walletId, CreateMoneyRequest request, UUID currentUserId) {
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId) || !groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new ResourceNotFoundException("Wallet does not belong to this group");
        }
        // Gán danh mục hệ thống: ưu tiên danh mục 'Gia đình & Con cái' (FAMILY)
        UUID categoryId = categoryRepository.findByCode("FAMILY")
                .map(Category::getId)
                .orElseGet(() -> categoryRepository.findSystemCategories().stream()
                        .filter(c -> !"SALARY_SYS".equals(c.getCode()) && !"SALARY".equals(c.getCode()))
                        .findFirst()
                        .map(Category::getId)
                        .orElseGet(() -> categoryRepository.findSystemCategories().stream().findFirst()
                                .orElseThrow(() -> new IllegalStateException("No system category configured"))
                                .getId()));
        ChildSpendRequest moneyRequest = ChildSpendRequest.builder()
                .walletId(walletId).amount(request.getAmount()).categoryId(categoryId)
                .description(MONEY_REQUEST_PREFIX + request.getDescription().trim())
                .status(SpendRequestStatus.PENDING).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        moneyRequest = spendRequestRepository.save(moneyRequest);

        try {
            String groupName = groupRepository.findById(groupId).map(com.finance.finance.modules.group.entity.Group::getName).orElse("nhóm");
            String childName = wallet.getChildName() != null ? wallet.getChildName() : "Bé";
            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            for (GroupMember member : members) {
                if (wallet.getUserId() == null || !member.getUserId().equals(wallet.getUserId())) {
                    notificationService.createNotification(
                            member.getUserId(),
                            NotificationType.CHILD_MONEY_REQUEST,
                            NotificationPriority.HIGH,
                            childName + " đã gửi yêu cầu xin tiền",
                            childName + " đang xin " + String.format("%,d", request.getAmount().longValue()) + "đ trong nhóm " + groupName + ". Lý do: " + request.getDescription().trim(),
                            "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=SPEND_REQUESTS",
                            "Xem yêu cầu"
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send child money request notification: {}", e.getMessage());
        }

        return buildSpendRequestResponse(moneyRequest);
    }

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
        }

        spendRequest = spendRequestRepository.save(spendRequest);
        return buildSpendRequestResponse(spendRequest);
    }

    /** A transaction entered by the child: deduct immediately from the child's own wallet. */
    @Transactional
    public SpendRequestResponse createDirectChildSpend(UUID groupId, UUID walletId, CreateSpendRequestRequest request, UUID currentUserId) {
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));
        if (!wallet.getGroupId().equals(groupId)) {
            throw new ResourceNotFoundException("This is not your child wallet");
        }
        boolean isOwnerChild = currentUserId.equals(wallet.getUserId());
        boolean isGroupParent = groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId);
        if (!isOwnerChild && !isGroupParent) {
            throw new ResourceNotFoundException("You do not have permission to manage this child wallet");
        }
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalStateException("Số dư ví không đủ để chi tiêu");
        }
        wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);
        ChildSpendRequest transaction = ChildSpendRequest.builder()
                .walletId(walletId).amount(request.getAmount()).categoryId(request.getCategoryId())
                .description(request.getDescription()).notes(request.getNotes()).imageKey(request.getImageKey())
                .status(SpendRequestStatus.APPROVED).respondedByUserId(currentUserId).respondedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        return buildSpendRequestResponse(spendRequestRepository.save(transaction));
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
        // Mọi thành viên trong gia đình (bố, mẹ, anh, chị) đều có thể cấp tiền cho bé từ ví của mình
        validateMember(groupId, currentUserId);

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

        boolean isMoneyRequest = spendRequest.getDescription().startsWith(MONEY_REQUEST_PREFIX);
        String fundSource = request.getSource() != null ? request.getSource() : "PERSONAL_ACCOUNT";

        if (isMoneyRequest) {
            if ("GROUP_FUND".equalsIgnoreCase(fundSource)) {
                GroupFund fund = groupFundRepository.findByGroupId(groupId)
                        .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
                if (fund.getBalance().compareTo(spendRequest.getAmount()) < 0) {
                    throw new IllegalArgumentException("Số dư quỹ nhóm không đủ để cấp cho bé");
                }
                fund.setBalance(fund.getBalance().subtract(spendRequest.getAmount()));
                groupFundRepository.save(fund);

                UUID familyCategory = categoryRepository.findByCode("FAMILY")
                        .map(Category::getId)
                        .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                                .stream().findFirst().map(Category::getId).orElse(null));

                String purpose = spendRequest.getDescription().replace(MONEY_REQUEST_PREFIX, "");
                GroupExpense expense = GroupExpense.builder()
                        .groupId(groupId)
                        .description("Cấp tiền quỹ nhóm cho bé (" + wallet.getChildName() + "): " + purpose)
                        .amount(spendRequest.getAmount())
                        .currency("VND")
                        .paidByUserId(currentUserId)
                        .createdByUserId(currentUserId)
                        .paymentSource("GROUP_FUND")
                        .categoryId(familyCategory)
                        .splitMethod(SplitMethod.EQUAL)
                        .expenseDate(LocalDateTime.now().toLocalDate())
                        .build();
                groupExpenseRepository.save(expense);
            } else {
                if (request.getSourceAccountId() == null) {
                    throw new IllegalArgumentException("Vui lòng chọn ví cá nhân để cấp tiền cho bé");
                }
                Account source = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví nguồn"));
                if (source.getBalance().compareTo(spendRequest.getAmount()) < 0) {
                    throw new IllegalStateException("Số dư ví nguồn không đủ");
                }
                source.setBalance(source.getBalance().subtract(spendRequest.getAmount()));
                accountRepository.save(source);
                UUID familyCategoryId = categoryRepository.findByCode("FAMILY")
                        .map(Category::getId)
                        .orElse(spendRequest.getCategoryId());

                Transaction parentTx = Transaction.builder().userId(currentUserId).accountId(source.getId())
                        .categoryId(familyCategoryId).type(TransactionType.EXPENSE).amount(spendRequest.getAmount())
                        .currencyCode(source.getCurrencyCode()).exchangeRate(BigDecimal.ONE).baseAmount(spendRequest.getAmount())
                        .occurredAt(java.time.Instant.now()).occurredDate(java.time.LocalDate.now())
                        .descriptionRaw("Cấp tiền cho ví bé: " + wallet.getChildName()).source(TransactionSource.MANUAL).build();
                transactionRepository.save(parentTx);
                spendRequest.setTransactionId(parentTx.getId());
            }
        } else {
            if (wallet.getBalance().compareTo(spendRequest.getAmount()) < 0) {
                throw new IllegalStateException("Insufficient balance in child wallet");
            }
        }
        // A parent-approved money request deposits funds; an ordinary spend request deducts funds.
        wallet.setBalance(isMoneyRequest ? wallet.getBalance().add(spendRequest.getAmount()) : wallet.getBalance().subtract(spendRequest.getAmount()));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Update request
        spendRequest.setStatus(SpendRequestStatus.APPROVED);
        spendRequest.setRespondedByUserId(currentUserId);
        spendRequest.setRespondedAt(LocalDateTime.now());
        spendRequest.setUpdatedAt(LocalDateTime.now());

        spendRequest = spendRequestRepository.save(spendRequest);

        if (wallet.getUserId() != null) {
            try {
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_REQUEST_RESPONDED,
                        NotificationPriority.HIGH,
                        "Yêu cầu xin tiền đã được duyệt! 🎉",
                        "Yêu cầu xin " + String.format("%,d", spendRequest.getAmount().longValue()) + "đ của bạn đã được duyệt và cộng vào ví.",
                        "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=SPEND_REQUESTS",
                        "Xem ví của em"
                );
            } catch (Exception e) {
                log.warn("Failed to notify child on approved request: {}", e.getMessage());
            }
        }

        return buildSpendRequestResponse(spendRequest);
    }

    @Transactional
    public SpendRequestResponse rejectSpendRequest(UUID groupId, UUID walletId, UUID requestId, 
                                                  RejectSpendRequestRequest request, UUID currentUserId) {
        // Mọi thành viên trong gia đình đều có thể từ chối yêu cầu xin tiền
        validateMember(groupId, currentUserId);

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
        spendRequest.setRejectionReason(request.getReason());
        spendRequest.setUpdatedAt(LocalDateTime.now());

        spendRequest = spendRequestRepository.save(spendRequest);

        ChildWallet wallet = walletRepository.findById(walletId).orElse(null);
        if (wallet != null && wallet.getUserId() != null) {
            try {
                String reason = request.getReason() != null && !request.getReason().isBlank() ? " Lý do: " + request.getReason() : "";
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_REQUEST_RESPONDED,
                        NotificationPriority.NORMAL,
                        "Yêu cầu xin tiền chưa được duyệt",
                        "Yêu cầu xin " + String.format("%,d", spendRequest.getAmount().longValue()) + "đ của bạn chưa được chấp thuận." + reason,
                        "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=SPEND_REQUESTS",
                        "Xem ví của em"
                );
            } catch (Exception e) {
                log.warn("Failed to notify child on rejected request: {}", e.getMessage());
            }
        }

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
        // Mọi thành viên trong gia đình đều có thể giao nhiệm vụ cho bé
        validateMember(groupId, currentUserId);

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

        if (wallet.getUserId() != null) {
            try {
                String rewardStr = chore.getRewardAmount() != null && chore.getRewardAmount().compareTo(BigDecimal.ZERO) > 0
                        ? " Phần thưởng: " + String.format("%,d", chore.getRewardAmount().longValue()) + "đ."
                        : "";
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_CHORE_ASSIGNED,
                        NotificationPriority.NORMAL,
                        "Bạn có nhiệm vụ mới! 🎯",
                        "Bạn vừa được giao nhiệm vụ: " + chore.getTitle() + "." + rewardStr,
                        "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=CHORES",
                        "Xem nhiệm vụ"
                );
            } catch (Exception e) {
                log.warn("Failed to notify child on new chore: {}", e.getMessage());
            }
        }

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

        if (chore.getStatus() != ChoreStatus.ASSIGNED 
                && chore.getStatus() != ChoreStatus.IN_PROGRESS 
                && chore.getStatus() != ChoreStatus.REJECTED) {
            throw new IllegalStateException("Chore cannot be completed in current status");
        }

        chore.setStatus(ChoreStatus.SUBMITTED);
        chore.setCompletedAt(LocalDateTime.now());
        chore.setProofImageKey(request.getProofImageKey());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);

        try {
            ChildWallet wallet = walletRepository.findById(walletId).orElse(null);
            String groupName = groupRepository.findById(groupId).map(com.finance.finance.modules.group.entity.Group::getName).orElse("nhóm");
            String childName = (wallet != null && wallet.getChildName() != null) ? wallet.getChildName() : "Bé";
            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            for (GroupMember member : members) {
                if (wallet == null || wallet.getUserId() == null || !member.getUserId().equals(wallet.getUserId())) {
                    notificationService.createNotification(
                            member.getUserId(),
                            NotificationType.CHILD_CHORE_COMPLETED,
                            NotificationPriority.HIGH,
                            childName + " đã hoàn thành nhiệm vụ!",
                            childName + " vừa gửi xác nhận hoàn thành nhiệm vụ: " + chore.getTitle() + " trong nhóm " + groupName + ". Hãy kiểm tra và duyệt thưởng nhé!",
                            "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=CHORES",
                            "Duyệt nhiệm vụ"
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send chore completed notification: {}", e.getMessage());
        }

        return buildChoreResponse(chore);
    }

    @Transactional
    public ChoreResponse approveChore(UUID groupId, UUID walletId, UUID choreId, ApproveChoreRequest request, UUID currentUserId) {
        // Validate user is member of group
        validateMember(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        if (chore.getStatus() != ChoreStatus.SUBMITTED && chore.getStatus() != ChoreStatus.ASSIGNED) {
            throw new IllegalStateException("Chore must be submitted or assigned before approval");
        }

        // Get wallet and add reward
        ChildWallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        String source = request.getSource() != null ? request.getSource() : "PERSONAL_ACCOUNT";
        String choreTitle = chore.getTitle();
        BigDecimal reward = chore.getRewardAmount();

        // Trừ tiền nguồn thanh toán phần thưởng và ghi nhận lịch sử thu chi
        if ("GROUP_FUND".equalsIgnoreCase(source)) {
            GroupFund fund = groupFundRepository.findByGroupId(groupId)
                    .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
            if (fund.getBalance().compareTo(reward) < 0) {
                throw new IllegalArgumentException("Số dư quỹ nhóm không đủ để thưởng cho bé");
            }
            fund.setBalance(fund.getBalance().subtract(reward));
            groupFundRepository.save(fund);

            UUID familyCategory = categoryRepository.findByCode("FAMILY")
                    .map(Category::getId)
                    .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                            .stream().findFirst().map(Category::getId).orElse(null));

            GroupExpense expense = GroupExpense.builder()
                    .groupId(groupId)
                    .description("Thưởng nhiệm vụ cho bé (" + wallet.getChildName() + "): " + choreTitle)
                    .amount(reward)
                    .currency("VND")
                    .paidByUserId(currentUserId)
                    .createdByUserId(currentUserId)
                    .paymentSource("GROUP_FUND")
                    .categoryId(familyCategory)
                    .splitMethod(SplitMethod.EQUAL)
                    .expenseDate(LocalDateTime.now().toLocalDate())
                    .build();
            groupExpenseRepository.save(expense);
        } else if (request.getSourceAccountId() != null) {
            Account account = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví nguồn"));
            if (account.getBalance().compareTo(reward) < 0) {
                throw new IllegalStateException("Số dư ví nguồn không đủ để thưởng cho bé");
            }
            account.setBalance(account.getBalance().subtract(reward));
            accountRepository.save(account);

            UUID familyCategory = categoryRepository.findByCode("FAMILY")
                    .map(Category::getId)
                    .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                            .stream().findFirst().map(Category::getId).orElse(null));

            Transaction parentTx = Transaction.builder()
                    .userId(currentUserId)
                    .accountId(account.getId())
                    .categoryId(familyCategory)
                    .type(TransactionType.EXPENSE)
                    .amount(reward)
                    .currencyCode(account.getCurrencyCode())
                    .exchangeRate(BigDecimal.ONE)
                    .baseAmount(reward)
                    .occurredAt(java.time.Instant.now())
                    .occurredDate(java.time.LocalDate.now())
                    .descriptionRaw("Thưởng việc nhà cho bé (" + wallet.getChildName() + "): " + choreTitle)
                    .source(TransactionSource.MANUAL)
                    .build();
            transactionRepository.save(parentTx);
        }

        wallet.setBalance(wallet.getBalance().add(reward));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Update chore
        chore.setStatus(ChoreStatus.APPROVED);
        chore.setApprovedByUserId(currentUserId);
        chore.setApprovedAt(LocalDateTime.now());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);

        // Ghi lại lịch sử nhận tiền thưởng nhiệm vụ vào ví bé (THU NHẬP [INCOME_CHORE])
        UUID rewardCategory = categoryRepository.findByCode("FAMILY")
                .map(Category::getId)
                .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(currentUserId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                        .stream().findFirst().map(Category::getId).orElse(null));

        ChildSpendRequest choreRewardRecord = ChildSpendRequest.builder()
                .walletId(walletId)
                .amount(reward)
                .categoryId(rewardCategory)
                .description("[INCOME_CHORE] Thưởng làm nhiệm vụ: " + chore.getTitle())
                .status(SpendRequestStatus.APPROVED)
                .respondedByUserId(currentUserId)
                .respondedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        spendRequestRepository.save(choreRewardRecord);

        if (wallet.getUserId() != null) {
            try {
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_MONEY_RECEIVED,
                        NotificationPriority.HIGH,
                        "Nhiệm vụ đã được duyệt! 🎉",
                        "Nhiệm vụ " + chore.getTitle() + " đã được duyệt! Bạn được thưởng " + String.format("%,d", reward.longValue()) + "đ vào ví.",
                        "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=CHORES",
                        "Xem ví của em"
                );
            } catch (Exception e) {
                log.warn("Failed to notify child on approved chore: {}", e.getMessage());
            }
        }

        return buildChoreResponse(chore);
    }

    @Transactional
    public ChoreResponse rejectChore(UUID groupId, UUID walletId, UUID choreId, RejectChoreRequest request, UUID currentUserId) {
        // Mọi thành viên trong gia đình đều có thể xét duyệt nhiệm vụ
        validateMember(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        if (chore.getStatus() != ChoreStatus.SUBMITTED && chore.getStatus() != ChoreStatus.ASSIGNED && chore.getStatus() != ChoreStatus.IN_PROGRESS) {
            throw new IllegalStateException("Chore cannot be rejected/failed in current status");
        }

        // Nếu canRetry = false thì đánh dấu nhiệm vụ là FAILED (Không hoàn thành), ngược lại REJECTED (Cần làm lại)
        boolean isFailed = Boolean.FALSE.equals(request.getCanRetry());
        chore.setStatus(isFailed ? ChoreStatus.FAILED : ChoreStatus.REJECTED);
        chore.setRejectionReason(request.getReason());
        chore.setRejectedAt(LocalDateTime.now());
        chore.setApprovedByUserId(currentUserId);
        chore.setApprovedAt(LocalDateTime.now());
        chore.setUpdatedAt(LocalDateTime.now());

        chore = choreRepository.save(chore);

        ChildWallet wallet = walletRepository.findById(walletId).orElse(null);
        if (wallet != null && wallet.getUserId() != null) {
            try {
                String reason = request.getReason() != null && !request.getReason().isBlank() ? " Lý do: " + request.getReason() : "";
                String title = isFailed ? "Nhiệm vụ không thành công" : "Nhiệm vụ cần làm lại";
                String message = isFailed 
                        ? "Nhiệm vụ " + chore.getTitle() + " của bạn được đánh dấu không hoàn thành." + reason
                        : "Nhiệm vụ " + chore.getTitle() + " của bạn cần làm lại." + reason;
                notificationService.createNotification(
                        wallet.getUserId(),
                        NotificationType.CHILD_REQUEST_RESPONDED,
                        NotificationPriority.NORMAL,
                        title,
                        message,
                        "/groups?groupId=" + groupId + "&tab=CHILD_WALLETS&walletId=" + walletId + "&modal=CHORES",
                        "Xem nhiệm vụ"
                );
            } catch (Exception e) {
                log.warn("Failed to notify child on rejected chore: {}", e.getMessage());
            }
        }

        return buildChoreResponse(chore);
    }

    @Transactional
    public void deleteChore(UUID groupId, UUID walletId, UUID choreId, UUID currentUserId) {
        // Mọi thành viên trong gia đình đều có thể quản lý nhiệm vụ
        validateMember(groupId, currentUserId);

        ChildChore chore = choreRepository.findById(choreId)
                .orElseThrow(() -> new ResourceNotFoundException("Chore not found"));

        if (!chore.getWalletId().equals(walletId)) {
            throw new ResourceNotFoundException("Chore does not belong to this wallet");
        }

        choreRepository.delete(chore);
    }

    // ============ Helper Methods ============

    private void validateMember(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new ResourceNotFoundException("User is not a member of this group");
        }
    }

    private void validateAdminOrOwner(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_IdAndRoleIn(
                groupId, userId, java.util.Arrays.asList(MemberRole.OWNER, MemberRole.ADMIN))) {
            throw new ResourceNotFoundException("Only admins and owners can perform this action");
        }
    }

    private SpendRequestResponse buildSpendRequestResponse(ChildSpendRequest request) {
        final boolean isIncomeKind = request.getDescription() != null && (
                request.getDescription().startsWith(MONEY_REQUEST_PREFIX)
                || request.getDescription().startsWith("[INCOME_DEPOSIT] ")
                || request.getDescription().startsWith("[INCOME_CHORE] "));

        SpendRequestResponse.CategorySummary category = categoryRepository.findById(request.getCategoryId())
                .filter(item -> item.getDeletedAt() == null)
                .map(item -> {
                    String catName = item.getName();
                    String catIcon = item.getIcon();
                    String catColor = item.getColor();
                    // Các khoản bố mẹ cấp, nạp ví, thưởng cho bé luôn thuộc ngữ cảnh "Gia đình" thay vì "Lương"
                    if (isIncomeKind && ("Lương".equalsIgnoreCase(catName) || "SALARY_SYS".equalsIgnoreCase(item.getCode()) || "SALARY".equalsIgnoreCase(item.getCode()))) {
                        catName = "Gia đình & Con cái";
                        catIcon = "users";
                        catColor = "#10b981";
                    }
                    return SpendRequestResponse.CategorySummary.builder()
                            .id(item.getId()).name(catName).icon(catIcon).color(catColor).build();
                })
                .orElse(null);
        String respondedByUserName = null;
        if (request.getRespondedByUserId() != null) {
            respondedByUserName = userRepository.findById(request.getRespondedByUserId())
                    .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                    .orElse("Bố/Mẹ");
        }

        return SpendRequestResponse.builder()
                .id(request.getId())
                .walletId(request.getWalletId())
                .amount(request.getAmount())
                .categoryId(request.getCategoryId())
                .description(request.getDescription())
                .status(request.getStatus().name())
                .respondedByUserId(request.getRespondedByUserId())
                .respondedByUserName(respondedByUserName)
                .respondedAt(request.getRespondedAt())
                .responseNotes(request.getResponseNotes())
                .rejectionReason(request.getRejectionReason())
                .transactionId(request.getTransactionId())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .category(category)
                .build();
    }

    private ChoreResponse buildChoreResponse(ChildChore chore) {
        String approvedByUserName = null;
        if (chore.getApprovedByUserId() != null) {
            approvedByUserName = userRepository.findById(chore.getApprovedByUserId())
                    .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                    .orElse("Bố/Mẹ");
        }

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
                .approvedByUserName(approvedByUserName)
                .approvedAt(chore.getApprovedAt())
                .rejectionReason(chore.getRejectionReason())
                .rejectedAt(chore.getRejectedAt())
                .createdAt(chore.getCreatedAt())
                .updatedAt(chore.getUpdatedAt())
                .build();
    }
}
