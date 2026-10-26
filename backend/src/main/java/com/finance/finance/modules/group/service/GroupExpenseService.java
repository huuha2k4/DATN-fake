package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.ActivityType;
import com.finance.finance.common.enums.SplitMethod;
import com.finance.finance.modules.group.dto.request.CreateExpenseRequest;
import com.finance.finance.modules.group.dto.request.UpdateExpenseRequest;
import com.finance.finance.modules.group.dto.response.BalanceResponse;
import com.finance.finance.modules.group.dto.response.ExpenseResponse;
import com.finance.finance.modules.group.entity.ExpenseSplit;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.repository.*;
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

    @Transactional
    public ExpenseResponse createExpense(UUID groupId, CreateExpenseRequest request, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        SplitMethod splitMethod = SplitMethod.valueOf(request.getSplitMethod());

        GroupExpense expense = GroupExpense.builder()
                .groupId(groupId)
                .description(request.getDescription())
                .amount(request.getAmount())
                .currency("VND") // TODO: Get from group
                .paidByUserId(request.getPaidByUserId())
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
        for (CreateExpenseRequest.ExpenseSplitDto splitDto : request.getSplits()) {
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

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.EXPENSE_ADDED,
                "Added expense: " + expense.getDescription(),
                Map.of("expenseId", expense.getId().toString(), "amount", expense.getAmount().toString()));

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

        if (request.getDescription() != null) {
            expense.setDescription(request.getDescription());
        }
        if (request.getAmount() != null) {
            expense.setAmount(request.getAmount());
        }
        if (request.getExpenseDate() != null) {
            expense.setExpenseDate(request.getExpenseDate());
        }
        if (request.getNotes() != null) {
            expense.setNotes(request.getNotes());
        }

        expense = groupExpenseRepository.save(expense);

        // Update splits if provided
        if (request.getSplits() != null && !request.getSplits().isEmpty()) {
            expenseSplitRepository.deleteByExpenseId(expenseId);

            List<ExpenseSplit> newSplits = new ArrayList<>();
            for (CreateExpenseRequest.ExpenseSplitDto splitDto : request.getSplits()) {
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

        expense.setDeletedAt(LocalDateTime.now());
        groupExpenseRepository.save(expense);

        // Log activity
        logActivity(groupId, currentUserId, ActivityType.EXPENSE_DELETED,
                "Deleted expense: " + expense.getDescription(),
                Map.of("expenseId", expenseId.toString()));
    }

    @Transactional(readOnly = true)
    public BalanceResponse getBalances(UUID groupId, UUID currentUserId) {
        validateMemberAccess(groupId, currentUserId);

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        List<BalanceResponse.MemberBalance> balances = new ArrayList<>();

        for (GroupMember member : members) {
            BigDecimal totalPaid = calculateTotalPaid(groupId, member.getUserId());
            BigDecimal totalOwed = calculateTotalOwed(groupId, member.getUserId());
            BigDecimal balance = totalPaid.subtract(totalOwed);

            BalanceResponse.UserSummary userSummary = BalanceResponse.UserSummary.builder()
                    .fullName("User " + member.getUserId())
                    .build();

            balances.add(BalanceResponse.MemberBalance.builder()
                    .userId(member.getUserId())
                    .balance(balance)
                    .totalPaid(totalPaid)
                    .totalOwed(totalOwed)
                    .user(userSummary)
                    .build());
        }

        // Calculate simplified debts using greedy algorithm
        List<BalanceResponse.SimplifiedDebt> simplifiedDebts = calculateSimplifiedDebts(balances);

        BigDecimal totalExpenses = groupExpenseRepository.sumAmountByGroupId(groupId);
        boolean isFullySettled = balances.stream()
                .allMatch(b -> b.getBalance().abs().compareTo(new BigDecimal("0.01")) < 0);

        return BalanceResponse.builder()
                .balances(balances)
                .simplifiedDebts(simplifiedDebts)
                .totalGroupExpenses(totalExpenses != null ? totalExpenses : BigDecimal.ZERO)
                .isFullySettled(isFullySettled)
                .build();
    }

    // Helper methods
    private BigDecimal calculateTotalPaid(UUID groupId, UUID userId) {
        return groupExpenseRepository.findByGroupId(groupId, Pageable.unpaged())
                .stream()
                .filter(e -> e.getPaidByUserId().equals(userId) && e.getDeletedAt() == null)
                .map(GroupExpense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalOwed(UUID groupId, UUID userId) {
        BigDecimal total = expenseSplitRepository.sumByGroupIdAndUserId(groupId, userId);
        return total != null ? total : BigDecimal.ZERO;
    }

    private List<BalanceResponse.SimplifiedDebt> calculateSimplifiedDebts(List<BalanceResponse.MemberBalance> balances) {
        List<BalanceResponse.SimplifiedDebt> debts = new ArrayList<>();

        // Separate creditors (positive balance) and debtors (negative balance)
        List<BalanceResponse.MemberBalance> creditors = balances.stream()
                .filter(b -> b.getBalance().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getBalance().compareTo(a.getBalance()))
                .collect(Collectors.toList());

        List<BalanceResponse.MemberBalance> debtors = balances.stream()
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
        // TODO: Check role
    }

    private void logActivity(UUID groupId, UUID userId, ActivityType type, String description, Map<String, Object> metadata) {
        // Simplified - actual implementation in GroupActivityService
    }

    private String serializeLocation(Object location) {
        // TODO: Implement location serialization if needed
        return null;
    }

    private ExpenseResponse buildExpenseResponse(GroupExpense expense, List<ExpenseSplit> splits) {
        Long commentCount = transactionCommentRepository.countByCommentableTypeAndId(
                com.finance.finance.common.enums.CommentableType.GROUP_EXPENSE, expense.getId());

        return ExpenseResponse.builder()
                .id(expense.getId())
                .groupId(expense.getGroupId())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .paidByUserId(expense.getPaidByUserId())
                .categoryId(expense.getCategoryId())
                .splitMethod(expense.getSplitMethod().name())
                .expenseDate(expense.getExpenseDate())
                .notes(expense.getNotes())
                .receiptKey(expense.getReceiptKey())
                .createdByUserId(expense.getCreatedByUserId())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .version(expense.getVersion())
                .commentCount(commentCount.intValue())
                .build();
    }
}
