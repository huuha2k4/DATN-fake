package com.finance.finance.modules.group.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.common.enums.SplitMethod;
import com.finance.finance.common.enums.GroupExpensePurpose;
import com.finance.finance.common.enums.FundReimbursementStatus;
import com.finance.finance.common.enums.SettlementStatus;
import com.finance.finance.modules.audit.model.AuditEventType;
import com.finance.finance.modules.audit.service.AuditEventRequest;
import com.finance.finance.modules.audit.service.SystemAuditService;
import com.finance.finance.modules.group.dto.request.CreateExpenseRequest;
import com.finance.finance.modules.group.dto.request.UpdateExpenseRequest;
import com.finance.finance.modules.group.dto.response.BalanceResponse;
import com.finance.finance.modules.group.dto.response.ExpenseResponse;
import com.finance.finance.modules.group.entity.ExpenseSplit;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.group.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupExpenseService {

    private final GroupExpenseRepository groupExpenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupActivityRepository groupActivityRepository;
    private final TransactionCommentRepository transactionCommentRepository;
    private final GroupFundRepository groupFundRepository;
    private final GroupRepository groupRepository;
    private final com.finance.finance.modules.account.repository.AccountRepository accountRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemAuditService systemAuditService;
    private final TransactionService transactionService;
    private final GroupFundContributionRepository groupFundContributionRepository;
    private final com.finance.finance.modules.category.repository.CategoryRepository categoryRepository;
    private final com.finance.finance.modules.user.repository.UserRepository userRepository;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final GroupFinanceConfigRepository groupFinanceConfigRepository;
    private final FundReimbursementRepository fundReimbursementRepository;
    private final GroupSettlementRepository groupSettlementRepository;

    @Transactional
    public ExpenseResponse createExpense(UUID groupId, CreateExpenseRequest request, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        SplitMethod splitMethod;
        GroupExpensePurpose purpose;
        try {
            purpose = GroupExpensePurpose.valueOf(request.getFinancialPurpose() == null
                    ? ("GROUP_FUND".equals(request.getPaymentSource()) ? "FUND_EXPENSE" : "MEMBER_SPLIT")
                    : request.getFinancialPurpose());
            splitMethod = request.getSplitMethod() == null ? SplitMethod.EQUAL : SplitMethod.valueOf(request.getSplitMethod());
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Phương thức chia hoặc mục đích tài chính không hợp lệ");
        }
        String paymentSource = request.getPaymentSource();
        if (!"GROUP_FUND".equals(paymentSource) && !"PERSONAL_ACCOUNT".equals(paymentSource)) {
            throw new IllegalArgumentException("Nguồn tiền không hợp lệ");
        }
        if (request.getCategoryId() == null) {
            throw new IllegalArgumentException("Khoản chi nhóm cần chọn danh mục chi");
        }
        if (request.getAmount() == null || request.getAmount().signum() <= 0) {
            throw new IllegalArgumentException("Số tiền chi phải lớn hơn 0");
        }
        var group = (purpose == GroupExpensePurpose.MEMBER_SPLIT
                ? groupRepository.findByIdForUpdate(groupId) : groupRepository.findByIdAndNotDeleted(groupId))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhóm"));
        categoryRepository.findByIdAndUserIdOrSystem(request.getCategoryId(), currentUserId)
                .filter(category -> category.isExpenseCategory())
                .orElseThrow(() -> new IllegalArgumentException("Danh mục chi không hợp lệ"));
        var config = groupFinanceConfigRepository.findById(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có cấu hình tài chính"));
        validatePurpose(config, purpose, paymentSource);
        List<CreateExpenseRequest.ExpenseSplitDto> normalizedSplits = normalizeSplits(
                groupId, purpose, splitMethod, request.getAmount(),
                request.getFinancialPurpose() == null && purpose != GroupExpensePurpose.MEMBER_SPLIT
                        ? List.of() : request.getSplits());
        UUID payerId = currentUserId;
        UUID sourceAccountId = null;
        UUID personalTransactionId = null;
        if ("GROUP_FUND".equals(paymentSource)) {
            GroupFund fund = groupFundRepository.findByGroupIdForUpdate(groupId)
                    .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
            if (fund.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalStateException("Số dư quỹ nhóm không đủ");
            }
            fund.setBalance(fund.getBalance().subtract(request.getAmount()));
            groupFundRepository.save(fund);
        } else {
            if (request.getSourceAccountId() == null) {
                throw new IllegalArgumentException("Chi từ ví cá nhân cần chọn ví nguồn và danh mục");
            }
            var account = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nguồn"));
            if (!group.getBaseCurrency().equalsIgnoreCase(account.getCurrencyCode())) {
                throw new IllegalArgumentException("Ví nguồn phải cùng loại tiền với nhóm");
            }
            sourceAccountId = account.getId();
            TransactionResponse transaction = transactionService.createTransaction(currentUserId,
                    CreateTransactionRequest.builder().transactionType(TransactionType.EXPENSE)
                            .accountId(sourceAccountId).categoryId(request.getCategoryId()).amount(request.getAmount())
                            .currencyCode(account.getCurrencyCode()).transactionDate(request.getExpenseDate())
                            .description("Chi cho nhóm: " + group.getName() + " - " + request.getDescription())
                            .note(request.getNotes()).isExcludedFromReport(false).build());
            personalTransactionId = transaction.getId();
        }

        GroupExpense expense = GroupExpense.builder()
                .groupId(groupId)
                .description(request.getDescription())
                .amount(request.getAmount())
                .currency(group.getBaseCurrency())
                .paidByUserId(payerId)
                .paymentSource(paymentSource)
                .financialPurpose(purpose)
                .sourceAccountId(sourceAccountId)
                .personalTransactionId(personalTransactionId)
                .categoryId(request.getCategoryId())
                .splitMethod(splitMethod)
                .expenseDate(request.getExpenseDate())
                .notes(request.getNotes())
                .receiptKey(request.getReceiptKey())
                .location(serializeLocation(request.getLocation()))
                .createdByUserId(currentUserId)
                .build();

        expense = groupExpenseRepository.save(expense);

        // Save splits
        List<ExpenseSplit> splits = new ArrayList<>();
        for (CreateExpenseRequest.ExpenseSplitDto splitDto : normalizedSplits) {
            ExpenseSplit split = ExpenseSplit.builder()
                    .expenseId(expense.getId())
                    .userId(splitDto.getUserId())
                    .amount(splitDto.getAmount())
                    .percentage(splitDto.getPercentage())
                    .shares(splitDto.getShares())
                    .build();
            splits.add(split);
        }
        expenseSplitRepository.saveAll(splits);
        if (purpose == GroupExpensePurpose.FUND_REIMBURSEMENT) {
            fundReimbursementRepository.save(com.finance.finance.modules.group.entity.FundReimbursement.builder()
                    .groupId(groupId).expenseId(expense.getId()).beneficiaryUserId(currentUserId)
                    .totalAmount(expense.getAmount()).reimbursedAmount(BigDecimal.ZERO)
                    .status(FundReimbursementStatus.PENDING).build());
        }
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.GROUP_EXPENSE_CREATED)
                    .actorId(currentUserId)
                    .groupId(groupId)
                    .resourceType("GROUP_EXPENSE")
                    .resourceId(expense.getId())
                    .newValues(Map.of("amount", expense.getAmount(), "splitMethod", expense.getSplitMethod().name()))
                    .build());
        }

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.EXPENSE_ADDED,
                "Added expense: " + expense.getDescription(),
                Map.of("expenseId", expense.getId().toString(), "amount", expense.getAmount().toString()));

        // Notify other group members
        try {
            String groupName = groupRepository.findById(groupId).map(com.finance.finance.modules.group.entity.Group::getName).orElse("nhóm");
            String creatorName = userRepository.findById(currentUserId)
                    .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername())
                    .orElse("Một thành viên");
            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            for (GroupMember member : members) {
                if (!member.getUserId().equals(currentUserId) && Boolean.TRUE.equals(member.getNotificationEnabled())) {
                    notificationService.createNotification(
                            member.getUserId(),
                            com.finance.finance.common.enums.NotificationType.GROUP_EXPENSE,
                            com.finance.finance.common.enums.NotificationPriority.NORMAL,
                            "Giao dịch mới trong nhóm " + groupName,
                            creatorName + " vừa thêm khoản chi \"" + expense.getDescription() + "\" với số tiền " + String.format("%,d", expense.getAmount().longValue()) + "đ trong nhóm " + groupName + ".",
                            "/groups?groupId=" + groupId + "&tab=EXPENSES",
                            "Xem chi tiêu"
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send group expense notification: {}", e.getMessage());
        }

        return buildExpenseResponse(expense, splits);
    }

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> getExpenses(UUID groupId, Pageable pageable, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        Page<GroupExpense> expenses = groupExpenseRepository.findByGroupId(groupId, pageable);

        return expenses.map(expense -> {
            List<ExpenseSplit> splits = expenseSplitRepository.findByExpenseId(expense.getId());
            return buildExpenseResponse(expense, splits);
        });
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpense(UUID groupId, UUID expenseId, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        GroupExpense expense = groupExpenseRepository.findByIdAndNotDeleted(expenseId)
                .orElseThrow(() -> new NoSuchElementException("Expense not found"));
        if (!expense.getGroupId().equals(groupId)) {
            throw new IllegalArgumentException("Expense does not belong to this group");
        }

        List<ExpenseSplit> splits = expenseSplitRepository.findByExpenseId(expenseId);
        return buildExpenseResponse(expense, splits);
    }

    @Transactional
    public ExpenseResponse updateExpense(UUID groupId, UUID expenseId, UpdateExpenseRequest request,
                                         UUID currentUserId) {
        validateAdminOrOwner(groupId, currentUserId);

        GroupExpense expense = groupExpenseRepository.findByIdAndNotDeleted(expenseId)
                .orElseThrow(() -> new NoSuchElementException("Expense not found"));
        if (!expense.getGroupId().equals(groupId)) throw new SecurityException("Expense does not belong to this group");
        if (request.getAmount() != null && (request.getAmount().signum() <= 0 || request.getAmount().stripTrailingZeros().scale() > 0)) {
            throw new IllegalArgumentException("Số tiền chi phải là số nguyên dương");
        }
        if (expense.getFinancialPurpose() == GroupExpensePurpose.MEMBER_SPLIT
                && (request.getAmount() != null || request.getSplits() != null)) {
            lockDebtForExpenseEdit(groupId);
            if (request.getAmount() != null && request.getAmount().compareTo(expense.getAmount()) != 0 && request.getSplits() == null) {
                throw new IllegalArgumentException("Cần cung cấp lại phần chia khi sửa tổng chi phí");
            }
        }
        if (request.getAmount() != null && fundReimbursementRepository.findByExpenseId(expenseId).isPresent()) {
            throw new IllegalStateException("Không thể sửa số tiền của khoản ứng đã tạo nghĩa vụ hoàn trả");
        }

        if (request.getDescription() != null) {
            expense.setDescription(request.getDescription());
        }
        if (request.getAmount() != null) {
            if ("GROUP_FUND".equals(expense.getPaymentSource())) {
                GroupFund fund = groupFundRepository.findByGroupIdForUpdate(groupId)
                        .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
                BigDecimal difference = request.getAmount().subtract(expense.getAmount());
                if (difference.signum() > 0 && fund.getBalance().compareTo(difference) < 0) {
                    throw new IllegalStateException("Số dư quỹ không đủ cho phần chi tăng thêm");
                }
                fund.setBalance(fund.getBalance().subtract(difference));
                groupFundRepository.save(fund);
            }
            expense.setAmount(request.getAmount());
        }
        if (request.getExpenseDate() != null) {
            expense.setExpenseDate(request.getExpenseDate());
        }
        if (request.getNotes() != null) {
            expense.setNotes(request.getNotes());
        }

        expense = groupExpenseRepository.save(expense);

        if (expense.getPersonalTransactionId() != null && (request.getAmount() != null
                || request.getDescription() != null || request.getExpenseDate() != null || request.getNotes() != null)) {
            transactionService.updateGroupExpenseTransaction(expense.getPaidByUserId(), expense.getPersonalTransactionId(),
                    com.finance.finance.modules.transaction.dto.request.UpdateTransactionRequest.builder()
                            .amount(request.getAmount()).description(request.getDescription())
                            .transactionDate(request.getExpenseDate()).note(request.getNotes()).build());
        }

        // Update splits if provided
        if (request.getSplits() != null) {
            List<CreateExpenseRequest.ExpenseSplitDto> normalized = normalizeSplits(groupId,
                    expense.getFinancialPurpose(), expense.getSplitMethod(), expense.getAmount(), request.getSplits());
            expenseSplitRepository.deleteByExpenseId(expenseId);

            List<ExpenseSplit> newSplits = new ArrayList<>();
            for (CreateExpenseRequest.ExpenseSplitDto splitDto : normalized) {
                ExpenseSplit split = ExpenseSplit.builder()
                        .expenseId(expenseId)
                        .userId(splitDto.getUserId())
                        .amount(splitDto.getAmount())
                        .percentage(splitDto.getPercentage())
                        .shares(splitDto.getShares())
                        .build();
                newSplits.add(split);
            }
            expenseSplitRepository.saveAll(newSplits);
        }

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.EXPENSE_UPDATED,
                "Updated expense: " + expense.getDescription(),
                Map.of("expenseId", expenseId.toString()));

        List<ExpenseSplit> splits = expenseSplitRepository.findByExpenseId(expenseId);
        return buildExpenseResponse(expense, splits);
    }

    @Transactional
    public void deleteExpense(UUID groupId, UUID expenseId, UUID currentUserId) {
        validateAdminOrOwner(groupId, currentUserId);

        GroupExpense expense = groupExpenseRepository.findByIdAndNotDeleted(expenseId)
                .orElseThrow(() -> new NoSuchElementException("Expense not found"));
        if (!expense.getGroupId().equals(groupId)) throw new SecurityException("Expense does not belong to this group");
        if (fundReimbursementRepository.findByExpenseId(expenseId).isPresent()) {
            throw new IllegalStateException("Không thể xóa khoản ứng có nghĩa vụ hoàn trả; hãy dùng nghiệp vụ điều chỉnh");
        }
        if (expense.getFinancialPurpose() == GroupExpensePurpose.MEMBER_SPLIT) lockDebtForExpenseEdit(groupId);

        if ("GROUP_FUND".equals(expense.getPaymentSource())) {
            GroupFund fund = groupFundRepository.findByGroupIdForUpdate(groupId)
                    .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
            fund.setBalance(fund.getBalance().add(expense.getAmount()));
            groupFundRepository.save(fund);
        }

        expense.setDeletedAt(LocalDateTime.now());
        groupExpenseRepository.save(expense);
        if (systemAuditService != null) {
            systemAuditService.record(AuditEventRequest.builder()
                    .eventType(AuditEventType.GROUP_EXPENSE_DELETED)
                    .actorId(currentUserId)
                    .groupId(groupId)
                    .resourceType("GROUP_EXPENSE")
                    .resourceId(expenseId)
                    .oldValues(Map.of("amount", expense.getAmount()))
                    .build());
        }

        if (expense.getPersonalTransactionId() != null) {
            transactionService.deleteGroupExpenseTransaction(expense.getPaidByUserId(), expense.getPersonalTransactionId());
        }

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.EXPENSE_DELETED,
                "Deleted expense: " + expense.getDescription(),
                Map.of("expenseId", expenseId.toString()));
    }

    @Transactional(readOnly = true)
    public BalanceResponse getBalances(UUID groupId, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        Map<UUID, BigDecimal> paid = totalsByUser(groupExpenseRepository.sumMemberPayments(groupId));
        Map<UUID, BigDecimal> owed = totalsByUser(expenseSplitRepository.sumMemberSplits(groupId));
        Map<UUID, BigDecimal> settlementNet = new HashMap<>();
        var confirmed = groupSettlementRepository.findByGroupIdAndStatus(groupId, SettlementStatus.CONFIRMED);
        for (var settlement : confirmed) {
            settlementNet.merge(settlement.getFromUserId(), settlement.getAmount(), BigDecimal::add);
            settlementNet.merge(settlement.getToUserId(), settlement.getAmount().negate(), BigDecimal::add);
        }
        var users = userRepository.findAllById(members.stream().map(GroupMember::getUserId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(user -> user.getId(), user -> user));
        List<BalanceResponse.MemberBalance> balances = new ArrayList<>();
        for (GroupMember member : members) {
            BigDecimal personalPaid = paid.getOrDefault(member.getUserId(), BigDecimal.ZERO);
            BigDecimal totalPaid = personalPaid;
            BigDecimal totalOwed = owed.getOrDefault(member.getUserId(), BigDecimal.ZERO);
            BigDecimal balance = totalPaid.subtract(totalOwed).add(settlementNet.getOrDefault(member.getUserId(), BigDecimal.ZERO));

            BalanceResponse.UserSummary userSummary = Optional.ofNullable(users.get(member.getUserId()))
                    .map(user -> BalanceResponse.UserSummary.builder()
                            .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                            .avatarKey(user.getAvatarUrl()).build())
                    .orElse(BalanceResponse.UserSummary.builder().fullName("Thành viên").build());

            balances.add(BalanceResponse.MemberBalance.builder()
                    .userId(member.getUserId())
                    .balance(balance)
                    .totalPaid(totalPaid)
                    .totalOwed(totalOwed)
                    .personalExpensePaid(personalPaid)
                    .fundContribution(BigDecimal.ZERO)
                    .fundReserveShare(BigDecimal.ZERO)
                    .user(userSummary)
                    .build());
        }

        boolean simplify = groupFinanceConfigRepository.findById(groupId)
                .map(com.finance.finance.modules.group.entity.GroupFinanceConfig::isAllowDebtSimplification).orElse(true);
        var direct = simplify ? Optional.<List<BalanceResponse.SimplifiedDebt>>empty() : directDebts(groupId, confirmed);
        List<BalanceResponse.SimplifiedDebt> simplifiedDebts = direct.orElseGet(() -> calculateSimplifiedDebts(balances));
        boolean isFullySettled = simplifiedDebts.isEmpty()
                && balances.stream().allMatch(b -> b.getBalance().abs().compareTo(new BigDecimal("0.01")) < 0);

        BigDecimal totalExpenses = groupExpenseRepository.sumAmountByGroupId(groupId);

        return BalanceResponse.builder()
                .balances(balances)
                .simplifiedDebts(simplifiedDebts)
                .totalGroupExpenses(totalExpenses != null ? totalExpenses : BigDecimal.ZERO)
                .isFullySettled(isFullySettled)
                .debtStrategy(direct.isPresent() ? "DIRECT" : simplify ? "SIMPLIFIED" : "LEGACY_NET")
                .build();
    }

    private record DebtPair(UUID from, UUID to) {}

    private Optional<List<BalanceResponse.SimplifiedDebt>> directDebts(UUID groupId, List<com.finance.finance.modules.group.entity.GroupSettlement> settlements) {
        Map<DebtPair, BigDecimal> amounts = new HashMap<>();
        for (Object[] row : expenseSplitRepository.sumMemberDebts(groupId)) {
            amounts.put(new DebtPair((UUID) row[0], (UUID) row[1]), (BigDecimal) row[2]);
        }
        for (var settlement : settlements) {
            var key = new DebtPair(settlement.getFromUserId(), settlement.getToUserId());
            BigDecimal remaining = amounts.getOrDefault(key, BigDecimal.ZERO).subtract(settlement.getAmount());
            // Earlier indirect settlements can only be reconciled against the historical net balances.
            if (remaining.signum() < 0) return Optional.empty();
            amounts.put(key, remaining);
        }
        return Optional.of(amounts.entrySet().stream().sorted(Map.Entry.comparingByKey(
                        Comparator.comparing(DebtPair::from).thenComparing(DebtPair::to)))
                .map(entry -> {
                    var pair = entry.getKey();
                    return BalanceResponse.SimplifiedDebt.builder().fromUserId(pair.from()).toUserId(pair.to())
                            .amount(entry.getValue().subtract(amounts.getOrDefault(new DebtPair(pair.to(), pair.from()), BigDecimal.ZERO))).build();
                }).filter(debt -> debt.getAmount().signum() > 0).toList());
    }

    private void lockDebtForExpenseEdit(UUID groupId) {
        groupRepository.findByIdForUpdate(groupId).orElseThrow();
        if (groupSettlementRepository.existsByGroupIdAndStatus(groupId, SettlementStatus.CONFIRMED)) {
            throw new IllegalStateException("Nhóm đã ghi nhận quyết toán. Cần điều chỉnh có đối chiếu trước khi sửa phần chia cũ.");
        }
    }

    private Map<UUID, BigDecimal> totalsByUser(List<Object[]> rows) {
        Map<UUID, BigDecimal> totals = new HashMap<>();
        rows.forEach(row -> totals.put((UUID) row[0], (BigDecimal) row[1]));
        return totals;
    }

    private void validatePurpose(com.finance.finance.modules.group.entity.GroupFinanceConfig config,
                                 GroupExpensePurpose purpose, String paymentSource) {
        if (purpose == GroupExpensePurpose.FUND_EXPENSE && !"GROUP_FUND".equals(paymentSource)) {
            throw new IllegalArgumentException("Chi từ quỹ phải chọn nguồn quỹ chung");
        }
        if (purpose != GroupExpensePurpose.FUND_EXPENSE && !"PERSONAL_ACCOUNT".equals(paymentSource)) {
            throw new IllegalArgumentException("Nghiệp vụ này phải dùng nguồn tiền cá nhân");
        }
        if (purpose == GroupExpensePurpose.MEMBER_SPLIT && !config.isAllowMemberSplits()) {
            throw new IllegalStateException("Nhóm chưa bật chia tiền thành viên");
        }
        if (purpose == GroupExpensePurpose.FUND_EXPENSE && !config.isUseSharedFund()) {
            throw new IllegalStateException("Nhóm đã tắt quỹ chung");
        }
        if (purpose == GroupExpensePurpose.FUND_REIMBURSEMENT && !config.isAllowFundReimbursements()) {
            throw new IllegalStateException("Nhóm chưa bật hoàn trả tiền ứng từ quỹ");
        }
    }

    private List<CreateExpenseRequest.ExpenseSplitDto> normalizeSplits(
            UUID groupId, GroupExpensePurpose purpose, SplitMethod method, BigDecimal amount,
            List<CreateExpenseRequest.ExpenseSplitDto> requested) {
        if (amount.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Số tiền VND phải chính xác đến từng đồng");
        }
        if (purpose != GroupExpensePurpose.MEMBER_SPLIT) {
            if (requested != null && !requested.isEmpty()) {
                throw new IllegalArgumentException("Nghiệp vụ không chia tiền không được có phần chia thành viên");
            }
            return List.of();
        }
        if (requested == null || requested.isEmpty()) {
            throw new IllegalArgumentException("Giao dịch chia tiền cần ít nhất một thành viên");
        }
        Map<UUID, CreateExpenseRequest.ExpenseSplitDto> unique = new HashMap<>();
        for (var split : requested) {
            if (unique.putIfAbsent(split.getUserId(), split) != null) {
                throw new IllegalArgumentException("Danh sách chia tiền có thành viên trùng lặp");
            }
            var member = groupMemberRepository.findByGroupIdAndUserId(groupId, split.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Không thể chia cho người không thuộc nhóm"));
            if (Boolean.TRUE.equals(member.getIsChildProfile())) {
                throw new IllegalArgumentException("Không tự động đưa trẻ em vào khoản chia");
            }
        }
        if (method == SplitMethod.EXACT) {
            if (requested.stream().anyMatch(row -> row.getAmount() == null || row.getAmount().signum() < 0
                    || row.getAmount().stripTrailingZeros().scale() > 0)) {
                throw new IllegalArgumentException("Phần chia VND phải là số nguyên không âm");
            }
            BigDecimal total = requested.stream().map(CreateExpenseRequest.ExpenseSplitDto::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.compareTo(amount) != 0) throw new IllegalArgumentException("Tổng phần chia phải bằng tổng chi phí");
            return requested;
        }
        List<CreateExpenseRequest.ExpenseSplitDto> ordered = requested.stream()
                .sorted(Comparator.comparing(CreateExpenseRequest.ExpenseSplitDto::getUserId)).toList();
        List<BigDecimal> weights = new ArrayList<>();
        if (method == SplitMethod.EQUAL) {
            ordered.forEach(item -> weights.add(BigDecimal.ONE));
        } else if (method == SplitMethod.PERCENTAGE) {
            BigDecimal total = ordered.stream().map(item -> item.getPercentage() == null ? BigDecimal.ZERO : item.getPercentage())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.compareTo(new BigDecimal("100")) != 0) throw new IllegalArgumentException("Tổng tỷ lệ phải bằng 100%");
            ordered.forEach(item -> weights.add(item.getPercentage() == null ? BigDecimal.ZERO : item.getPercentage()));
        } else {
            BigDecimal total = ordered.stream().map(item -> item.getShares() == null ? BigDecimal.ZERO : item.getShares())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.signum() <= 0) throw new IllegalArgumentException("Tổng số phần phải lớn hơn 0");
            ordered.forEach(item -> weights.add(item.getShares() == null ? BigDecimal.ZERO : item.getShares()));
        }
        allocateWholeDong(amount.longValueExact(), ordered, weights);
        return ordered;
    }

    private void allocateWholeDong(long total, List<CreateExpenseRequest.ExpenseSplitDto> rows, List<BigDecimal> weights) {
        BigDecimal weightTotal = weights.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        record Allocation(int index, long floor, BigDecimal remainder) {}
        List<Allocation> allocations = new ArrayList<>();
        long assigned = 0;
        for (int i = 0; i < rows.size(); i++) {
            BigDecimal raw = BigDecimal.valueOf(total).multiply(weights.get(i))
                    .divide(weightTotal, 12, java.math.RoundingMode.DOWN);
            long floor = raw.setScale(0, java.math.RoundingMode.DOWN).longValueExact();
            assigned += floor;
            allocations.add(new Allocation(i, floor, raw.subtract(BigDecimal.valueOf(floor))));
        }
        allocations.sort(Comparator.comparing(Allocation::remainder).reversed()
                .thenComparing(a -> rows.get(a.index()).getUserId()));
        long extra = total - assigned;
        long[] values = new long[rows.size()];
        allocations.forEach(a -> values[a.index()] = a.floor());
        for (int i = 0; i < extra; i++) values[allocations.get(i).index()]++;
        for (int i = 0; i < rows.size(); i++) rows.get(i).setAmount(BigDecimal.valueOf(values[i]));
    }

    private List<BalanceResponse.SimplifiedDebt> calculateSimplifiedDebts(List<BalanceResponse.MemberBalance> balances) {
        List<BalanceResponse.SimplifiedDebt> debts = new ArrayList<>();

        // Separate creditors (positive balance) and debtors (negative balance)
        List<BalanceResponse.MemberBalance> working = balances.stream().map(b -> BalanceResponse.MemberBalance.builder()
                .userId(b.getUserId()).balance(b.getBalance()).user(b.getUser()).build()).toList();
        List<BalanceResponse.MemberBalance> creditors = working.stream()
                .filter(b -> b.getBalance().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getBalance().compareTo(a.getBalance()))
                .collect(Collectors.toList());

        List<BalanceResponse.MemberBalance> debtors = working.stream()
                .filter(b -> b.getBalance().compareTo(BigDecimal.ZERO) < 0)
                .sorted((a, b) -> a.getBalance().compareTo(b.getBalance()))
                .collect(Collectors.toList());

        // Greedy algorithm to minimize transactions
        int i = 0, j = 0;
        while (i < creditors.size() && j < debtors.size()) {
            BalanceResponse.MemberBalance creditor = creditors.get(i);
            BalanceResponse.MemberBalance debtor = debtors.get(j);

            BigDecimal creditAmount = creditor.getBalance();
            BigDecimal debtAmount = debtor.getBalance().abs();
            BigDecimal paymentAmount = creditAmount.min(debtAmount);

            debts.add(BalanceResponse.SimplifiedDebt.builder()
                    .fromUserId(debtor.getUserId())
                    .toUserId(creditor.getUserId())
                    .amount(paymentAmount)
                    .fromUser(debtor.getUser())
                    .toUser(creditor.getUser())
                    .build());

            creditor.setBalance(creditor.getBalance().subtract(paymentAmount));
            debtor.setBalance(debtor.getBalance().add(paymentAmount));

            if (creditor.getBalance().compareTo(new BigDecimal("0.01")) < 0) i++;
            if (debtor.getBalance().abs().compareTo(new BigDecimal("0.01")) < 0) j++;
        }

        return debts;
    }

    private void validateMemberAccess(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new SecurityException("User is not a member of this group");
        }
    }

    private void validateAdminOrOwner(UUID groupId, UUID userId) {
        GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("User is not a member"));
        
        // Check if user has permission (owner or admin can delete/edit expenses)
        if (member.getRole() != com.finance.finance.common.enums.MemberRole.OWNER && 
            member.getRole() != com.finance.finance.common.enums.MemberRole.ADMIN) {
            throw new SecurityException("Only group owner or admin can perform this action");
        }
    }

    private void logActivity(UUID groupId, UUID userId, ActivityType type, String description, Map<String, Object> metadata) {
        // Simplified - actual implementation in GroupActivityService
    }

    private String serializeLocation(Object location) {
        if (location == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(location);
        } catch (Exception e) {
            log.warn("Failed to serialize location: {}", e.getMessage());
            return null;
        }
    }

    private ExpenseResponse buildExpenseResponse(GroupExpense expense, List<ExpenseSplit> splits) {
        Long commentCount = transactionCommentRepository.countByCommentableTypeAndId(
                com.finance.finance.common.enums.CommentableType.GROUP_EXPENSE, expense.getId());
        ExpenseResponse.PayerSummary payer = userRepository.findById(expense.getPaidByUserId())
                .map(user -> ExpenseResponse.PayerSummary.builder()
                        .fullName(user.getFullName())
                        .avatarKey(user.getAvatarUrl())
                        .build())
                .orElse(null);
        ExpenseResponse.CategorySummary category = expense.getCategoryId() == null ? null : categoryRepository.findById(expense.getCategoryId())
                .map(item -> ExpenseResponse.CategorySummary.builder()
                        .id(item.getId())
                        .name(item.getName())
                        .icon(item.getIcon())
                        .color(item.getColor())
                        .build())
                .orElse(null);

        return ExpenseResponse.builder()
                .id(expense.getId())
                .groupId(expense.getGroupId())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .paidByUserId(expense.getPaidByUserId())
                .paymentSource(expense.getPaymentSource())
                .financialPurpose(expense.getFinancialPurpose().name())
                .categoryId(expense.getCategoryId())
                .splitMethod(expense.getSplitMethod().name())
                .expenseDate(expense.getExpenseDate())
                .notes(expense.getNotes())
                .receiptKey(expense.getReceiptKey())
                .createdByUserId(expense.getCreatedByUserId())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .version(expense.getVersion())
                .payer(payer)
                .category(category)
                .splits(splits.stream().map(split -> ExpenseResponse.SplitSummary.builder()
                        .id(split.getId()).userId(split.getUserId()).amount(split.getAmount())
                        .percentage(split.getPercentage()).shares(split.getShares())
                        .user(userRepository.findById(split.getUserId())
                                .map(user -> ExpenseResponse.UserInfo.builder()
                                        .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                                        .avatarKey(user.getAvatarUrl()).build()).orElse(null))
                        .build()).toList())
                .commentCount(commentCount.intValue())
                .build();
    }
}
