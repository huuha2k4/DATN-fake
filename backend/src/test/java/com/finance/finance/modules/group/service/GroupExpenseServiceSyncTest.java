package com.finance.finance.modules.group.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.dto.request.UpdateExpenseRequest;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupMember;
import com.finance.finance.modules.group.repository.ExpenseSplitRepository;
import com.finance.finance.modules.group.repository.GroupActivityRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupFundContributionRepository;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.group.repository.TransactionCommentRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupExpenseServiceSyncTest {

    @Mock GroupExpenseRepository groupExpenseRepository;
    @Mock ExpenseSplitRepository expenseSplitRepository;
    @Mock GroupMemberRepository groupMemberRepository;
    @Mock GroupActivityRepository groupActivityRepository;
    @Mock TransactionCommentRepository transactionCommentRepository;
    @Mock GroupFundRepository groupFundRepository;
    @Mock GroupRepository groupRepository;
    @Mock AccountRepository accountRepository;
    @Mock TransactionService transactionService;
    @Mock GroupFundContributionRepository groupFundContributionRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock TransactionRepository transactionRepository;
    @Mock ObjectMapper objectMapper;

    @InjectMocks GroupExpenseService service;

    @Test
    void updateExpensePropagatesPersonalTransactionSyncFailure() {
        UUID groupId = UUID.randomUUID();
        UUID expenseId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID personalTxId = UUID.randomUUID();

        GroupMember admin = GroupMember.builder()
                .role(MemberRole.OWNER)
                .build();
        GroupExpense expense = GroupExpense.builder()
                .id(expenseId)
                .groupId(groupId)
                .description("Ăn tối nhóm")
                .amount(new BigDecimal("200000"))
                .personalTransactionId(personalTxId)
                .build();
        Transaction personalTx = Transaction.builder()
                .id(personalTxId)
                .userId(userId)
                .amount(new BigDecimal("200000"))
                .build();

        UpdateExpenseRequest request = new UpdateExpenseRequest();
        request.setAmount(new BigDecimal("250000"));

        when(groupMemberRepository.findByGroupIdAndUserId(groupId, userId)).thenReturn(Optional.of(admin));
        when(groupExpenseRepository.findByIdAndNotDeleted(expenseId)).thenReturn(Optional.of(expense));
        when(groupExpenseRepository.save(any(GroupExpense.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.findById(personalTxId)).thenReturn(Optional.of(personalTx));
        when(transactionRepository.save(any(Transaction.class))).thenThrow(new IllegalStateException("Sync failed"));

        assertThrows(IllegalStateException.class, () -> service.updateExpense(groupId, expenseId, request, userId));
    }
}
