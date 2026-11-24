package com.finance.finance.modules.transaction.service;

import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.exception.AccountNotFoundException;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.budget.repository.BudgetItemRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.debt.repository.DebtPaymentRepository;
import com.finance.finance.modules.debt.repository.DebtRepository;
import com.finance.finance.modules.goal.repository.GoalContributionRepository;
import com.finance.finance.modules.goal.repository.GoalRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupFundContributionRepository;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupSettlementRepository;
import com.finance.finance.modules.merchant.repository.MerchantRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.ocr.repository.ReceiptRepository;
import com.finance.finance.modules.schedule.repository.ScheduleOccurrenceRepository;
import com.finance.finance.modules.transaction.dto.request.UpdateTransactionRequest;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.mapper.TransactionMapper;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.common.upload.FileUploadValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceOwnershipTest {

    @Mock TransactionRepository transactionRepository;
    @Mock TransactionMapper transactionMapper;
    @Mock AccountRepository accountRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock MerchantRepository merchantRepository;
    @Mock FileUploadValidator fileUploadValidator;
    @Mock BudgetItemRepository budgetItemRepository;
    @Mock NotificationService notificationService;
    @Mock ChildWalletRepository childWalletRepository;
    @Mock ReceiptRepository receiptRepository;
    @Mock GoalContributionRepository goalContributionRepository;
    @Mock GoalRepository goalRepository;
    @Mock DebtPaymentRepository debtPaymentRepository;
    @Mock DebtRepository debtRepository;
    @Mock GroupExpenseRepository groupExpenseRepository;
    @Mock GroupFundContributionRepository groupFundContributionRepository;
    @Mock GroupFundRepository groupFundRepository;
    @Mock GroupSettlementRepository groupSettlementRepository;
    @Mock ScheduleOccurrenceRepository scheduleOccurrenceRepository;

    @InjectMocks TransactionService service;

    @Test
    void rejectsForeignReplacementAccountBeforeRevertingBalance() {
        UUID userId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        UUID foreignAccountId = UUID.randomUUID();
        Transaction transaction = expense(userId, UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("100.00"));
        UpdateTransactionRequest request = UpdateTransactionRequest.builder()
                .accountId(foreignAccountId)
                .version(0L)
                .build();

        when(transactionRepository.findByIdAndUserId(transactionId, userId)).thenReturn(Optional.of(transaction));
        when(accountRepository.findByIdAndUserId(foreignAccountId, userId)).thenReturn(Optional.empty());

        assertThrows(AccountNotFoundException.class,
                () -> service.updateTransaction(userId, transactionId, request));

        verify(accountRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void rejectsForeignCategoryBeforeRevertingBalance() {
        UUID userId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        UUID foreignCategoryId = UUID.randomUUID();
        Transaction transaction = expense(userId, accountId, UUID.randomUUID(), new BigDecimal("100.00"));
        Account account = Account.builder().id(accountId).userId(userId).balance(new BigDecimal("900.00")).build();
        UpdateTransactionRequest request = UpdateTransactionRequest.builder()
                .categoryId(foreignCategoryId)
                .version(0L)
                .build();

        when(transactionRepository.findByIdAndUserId(transactionId, userId)).thenReturn(Optional.of(transaction));
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));
        when(categoryRepository.findByIdAndUserIdOrSystem(foreignCategoryId, userId)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class,
                () -> service.updateTransaction(userId, transactionId, request));

        assertEquals(new BigDecimal("900.00"), account.getBalance());
        verify(accountRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void rejectsForeignTransferDestinationBeforeRevertingEitherAccount() {
        UUID userId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        UUID sourceAccountId = UUID.randomUUID();
        UUID oldDestinationId = UUID.randomUUID();
        UUID foreignDestinationId = UUID.randomUUID();
        Account source = Account.builder().id(sourceAccountId).userId(userId).balance(new BigDecimal("900.00")).build();
        Transaction transaction = Transaction.builder()
                .id(transactionId)
                .userId(userId)
                .accountId(sourceAccountId)
                .toAccountId(oldDestinationId)
                .type(TransactionType.TRANSFER)
                .amount(new BigDecimal("100.00"))
                .toAmount(new BigDecimal("100.00"))
                .baseAmount(new BigDecimal("100.00"))
                .exchangeRate(BigDecimal.ONE)
                .version(0L)
                .build();
        UpdateTransactionRequest request = UpdateTransactionRequest.builder()
                .toAccountId(foreignDestinationId)
                .version(0L)
                .build();

        when(transactionRepository.findByIdAndUserId(transactionId, userId)).thenReturn(Optional.of(transaction));
        when(accountRepository.findByIdAndUserId(sourceAccountId, userId)).thenReturn(Optional.of(source));
        when(accountRepository.findByIdAndUserId(foreignDestinationId, userId)).thenReturn(Optional.empty());

        assertThrows(AccountNotFoundException.class,
                () -> service.updateTransaction(userId, transactionId, request));

        assertEquals(new BigDecimal("900.00"), source.getBalance());
        verify(accountRepository, never()).save(any());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void movingExpenseBetweenOwnedAccountsKeepsBalancesConsistent() {
        UUID userId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        UUID oldAccountId = UUID.randomUUID();
        UUID newAccountId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        Transaction transaction = expense(userId, oldAccountId, categoryId, new BigDecimal("100.00"));
        Account oldAccount = Account.builder().id(oldAccountId).userId(userId).balance(new BigDecimal("900.00")).build();
        Account newAccount = Account.builder().id(newAccountId).userId(userId).balance(new BigDecimal("500.00")).build();
        Category category = Category.builder().id(categoryId).build();
        UpdateTransactionRequest request = UpdateTransactionRequest.builder()
                .accountId(newAccountId)
                .amount(new BigDecimal("50.00"))
                .version(0L)
                .build();

        when(transactionRepository.findByIdAndUserId(transactionId, userId)).thenReturn(Optional.of(transaction));
        when(accountRepository.findByIdAndUserId(oldAccountId, userId)).thenReturn(Optional.of(oldAccount));
        when(accountRepository.findByIdAndUserId(newAccountId, userId)).thenReturn(Optional.of(newAccount));
        when(categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateTransaction(userId, transactionId, request);

        assertEquals(new BigDecimal("1000.00"), oldAccount.getBalance());
        assertEquals(new BigDecimal("450.00"), newAccount.getBalance());
        assertEquals(newAccountId, transaction.getAccountId());
        assertEquals(new BigDecimal("50.00"), transaction.getAmount());
    }

    private Transaction expense(UUID userId, UUID accountId, UUID categoryId, BigDecimal amount) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .accountId(accountId)
                .categoryId(categoryId)
                .type(TransactionType.EXPENSE)
                .amount(amount)
                .baseAmount(amount)
                .exchangeRate(BigDecimal.ONE)
                .version(0L)
                .build();
    }
}
