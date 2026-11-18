package com.finance.finance.modules.transaction.service;

import com.finance.finance.common.enums.CategoryStatus;
import com.finance.finance.common.enums.TransactionSource;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.transaction.dto.request.*;
import com.finance.finance.modules.transaction.dto.response.*;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.exception.InsufficientBalanceException;
import com.finance.finance.modules.transaction.exception.TransactionNotFoundException;
import com.finance.finance.modules.transaction.exception.VersionConflictException;
import com.finance.finance.modules.transaction.mapper.TransactionMapper;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.exception.AccountNotFoundException;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {
    
    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final com.finance.finance.modules.budget.repository.BudgetItemRepository budgetItemRepository;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;
    private final ChildWalletRepository childWalletRepository;
    private final com.finance.finance.modules.ocr.repository.ReceiptRepository receiptRepository;
    private final com.finance.finance.modules.goal.repository.GoalContributionRepository goalContributionRepository;
    private final com.finance.finance.modules.goal.repository.GoalRepository goalRepository;
    private final com.finance.finance.modules.debt.repository.DebtPaymentRepository debtPaymentRepository;
    private final com.finance.finance.modules.debt.repository.DebtRepository debtRepository;
    private final com.finance.finance.modules.group.repository.GroupExpenseRepository groupExpenseRepository;
    private final com.finance.finance.modules.group.repository.GroupFundContributionRepository groupFundContributionRepository;
    private final com.finance.finance.modules.group.repository.GroupFundRepository groupFundRepository;
    private final com.finance.finance.modules.group.repository.GroupSettlementRepository groupSettlementRepository;
    private final com.finance.finance.modules.schedule.repository.ScheduleOccurrenceRepository scheduleOccurrenceRepository;
    
    /**
     * Create a new transaction
     */
    @Transactional
    public TransactionResponse createTransaction(UUID userId, CreateTransactionRequest request) {
        if (childWalletRepository.findByUserId(userId).isPresent()) {
            throw new BusinessException("Tài khoản trẻ em chỉ có thể gửi yêu cầu chi tiêu từ ví do phụ huynh quản lý");
        }
        log.info("Creating transaction for user: {}, type: {}", userId, request.getTransactionType());
        
        // Validate request based on transaction type
        validateTransactionRequest(request);
        
        // Validate primary account
        Account account = accountRepository.findByIdAndUserId(request.getAccountId(), userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản nguồn: " + request.getAccountId()));
        
        Account toAccount = null;
        if (request.getTransactionType() == TransactionType.TRANSFER) {
            toAccount = accountRepository.findByIdAndUserId(request.getToAccountId(), userId)
                    .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản đích: " + request.getToAccountId()));
        }

        // Validate category
        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserIdOrSystem(request.getCategoryId(), userId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy danh mục: " + request.getCategoryId()));
        }

        BigDecimal balanceBefore = account.getBalance();
        BigDecimal balanceAfter = balanceBefore;

        // Update balances
        if (request.getTransactionType() == TransactionType.EXPENSE) {
            balanceAfter = balanceBefore.subtract(request.getAmount());
            account.setBalance(balanceAfter);
            accountRepository.save(account);
        } else if (request.getTransactionType() == TransactionType.INCOME) {
            balanceAfter = balanceBefore.add(request.getAmount());
            account.setBalance(balanceAfter);
            accountRepository.save(account);
        } else if (request.getTransactionType() == TransactionType.TRANSFER) {
            balanceAfter = balanceBefore.subtract(request.getAmount());
            if (request.getTransferFee() != null && request.getTransferFee().compareTo(BigDecimal.ZERO) > 0) {
                balanceAfter = balanceAfter.subtract(request.getTransferFee());
            }
            account.setBalance(balanceAfter);
            accountRepository.save(account);

            BigDecimal toAmount = request.getToAmount() != null ? request.getToAmount() : request.getAmount();
            toAccount.setBalance(toAccount.getBalance().add(toAmount));
            accountRepository.save(toAccount);
        }
        
        // Build transaction entity
        Transaction transaction = buildTransaction(userId, request);
        
        // Save transaction
        Transaction saved = transactionRepository.save(transaction);
        
        log.info("Transaction created successfully: {}", saved.getId());

        // Check and trigger Budget Alert if expense
        if (request.getTransactionType() == TransactionType.EXPENSE && request.getCategoryId() != null) {
            try {
                checkAndTriggerBudgetAlert(userId, request.getCategoryId(), category != null ? category.getName() : "Danh mục");
            } catch (Exception ex) {
                log.error("Failed to check budget alert for transaction", ex);
            }
        }
        
        TransactionResponse.CategoryDto catDto = mapToCategoryDto(category);
        // Merchant and tags are optional - implement fetch logic when merchant/tag modules are fully integrated
        return transactionMapper.toResponse(
                saved,
                account.getName(),
                account.getIcon(),
                toAccount != null ? toAccount.getName() : null,
                catDto,
                balanceBefore,
                balanceAfter,
                null, // merchant
                null  // tags
        );
    }
    
    /**
     * Get transaction by ID
     */
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID userId, UUID transactionId) {
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found: " + transactionId));
        
        Account account = transaction.getAccountId() != null ? 
                accountRepository.findById(transaction.getAccountId()).orElse(null) : null;
        Account toAccount = transaction.getToAccountId() != null ? 
                accountRepository.findById(transaction.getToAccountId()).orElse(null) : null;
        Category category = transaction.getCategoryId() != null ? 
                categoryRepository.findById(transaction.getCategoryId()).orElse(null) : null;

        return transactionMapper.toResponse(
                transaction,
                account != null ? account.getName() : null,
                account != null ? account.getIcon() : null,
                toAccount != null ? toAccount.getName() : null,
                mapToCategoryDto(category),
                null,
                null,
                null, // merchant
                null  // tags
        );
    }
    
    /**
     * List transactions with filters and pagination
     */
    @Transactional(readOnly = true)
    public TransactionListResponse listTransactions(UUID userId, TransactionFilter filter) {
        log.debug("Listing transactions for user: {}, filter: {}", userId, filter);
        
        // Build pageable
        Pageable pageable = buildPageable(filter);
        
        // Query transactions
        Page<Transaction> page;
        boolean hasSearch = filter.getSearch() != null && !filter.getSearch().isBlank();
        boolean hasOtherFilters = hasFilters(filter);
        
        if (hasSearch || hasOtherFilters) {
            page = transactionRepository.findWithFilters(
                    userId,
                    filter.getFromDate(),
                    filter.getToDate(),
                    filter.getAccountId(),
                    filter.getCategoryId(),
                    filter.getMerchantId(),
                    filter.getTransactionType(),
                    filter.getMinAmount(),
                    filter.getMaxAmount(),
                    filter.getCategoryStatus(),
                    filter.getIsExcludedFromReport(),
                    hasSearch ? filter.getSearch().trim() : null,
                    pageable
            );
        } else {
            page = transactionRepository.findByUserId(userId, pageable);
        }
        
        // Batch fetch accounts and categories to enrich responses
        Set<UUID> accountIds = page.getContent().stream()
                .flatMap(tx -> java.util.stream.Stream.of(tx.getAccountId(), tx.getToAccountId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, Account> accountMap = accountIds.isEmpty() ? Collections.emptyMap() :
                accountRepository.findAllById(accountIds).stream()
                        .collect(Collectors.toMap(Account::getId, Function.identity()));

        Set<UUID> categoryIds = page.getContent().stream()
                .map(Transaction::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, Category> categoryMap = categoryIds.isEmpty() ? Collections.emptyMap() :
                categoryRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(Category::getId, Function.identity()));

        // Map to response
        List<TransactionResponse> transactions = page.getContent().stream()
                .map(tx -> {
                    Account acc = tx.getAccountId() != null ? accountMap.get(tx.getAccountId()) : null;
                    Account toAcc = tx.getToAccountId() != null ? accountMap.get(tx.getToAccountId()) : null;
                    Category cat = tx.getCategoryId() != null ? categoryMap.get(tx.getCategoryId()) : null;
                    return transactionMapper.toResponse(
                            tx,
                            acc != null ? acc.getName() : null,
                            acc != null ? acc.getIcon() : null,
                            toAcc != null ? toAcc.getName() : null,
                            mapToCategoryDto(cat),
                            null,
                            null,
                            null, // merchant
                            null  // tags
                    );
                })
                .toList();
        
        // Calculate summary
        TransactionListResponse.SummaryDto summary = calculateSummary(userId, filter);
        
        // Build pagination
        TransactionListResponse.PaginationDto pagination = TransactionListResponse.PaginationDto.builder()
                .page(filter.getPage())
                .pageSize(filter.getPageSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
        
        return TransactionListResponse.builder()
                .transactions(transactions)
                .summary(summary)
                .pagination(pagination)
                .build();
    }
    
    /**
     * Update transaction
     */
    @Transactional
    public TransactionResponse updateTransaction(UUID userId, UUID transactionId, UpdateTransactionRequest request) {
        log.info("Updating transaction: {}, user: {}", transactionId, userId);
        
        // Find transaction
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found: " + transactionId));
        
        // Check version for optimistic locking if provided
        if (request.getVersion() != null && !transaction.getVersion().equals(request.getVersion())) {
            throw new VersionConflictException("Transaction has been modified by another process", 
                    request.getVersion(), transaction.getVersion());
        }

        // 1. Revert old balance impact before applying updated values
        revertAccountBalancesForTransaction(userId, transaction);
        
        // 2. Update fields
        updateTransactionFields(transaction, request);

        // 3. Apply new balance impact
        applyAccountBalancesForTransaction(userId, transaction);
        
        try {
            // Save with optimistic locking
            Transaction updated = transactionRepository.save(transaction);
            log.info("Transaction updated successfully: {}", updated.getId());

            // Sync OCR receipt if linked
            syncLinkedReceiptOnUpdate(userId, updated);
            
            // Sync Goal if this transaction was linked to a goal contribution or withdrawal
            syncLinkedGoalOnUpdate(updated);

            // Sync Debt Payment if this transaction was linked to a debt repayment or collection
            syncLinkedDebtOnUpdate(updated);

            // Sync Group entities (expense, fund, settlement)
            syncLinkedGroupOnUpdate(updated);

            // Sync Schedule occurrence if linked
            syncLinkedScheduleOnUpdate(updated);
            
            Account account = updated.getAccountId() != null ? 
                    accountRepository.findById(updated.getAccountId()).orElse(null) : null;
            Account toAccount = updated.getToAccountId() != null ? 
                    accountRepository.findById(updated.getToAccountId()).orElse(null) : null;
            Category category = updated.getCategoryId() != null ? 
                    categoryRepository.findById(updated.getCategoryId()).orElse(null) : null;

            return transactionMapper.toResponse(
                    updated,
                    account != null ? account.getName() : null,
                    account != null ? account.getIcon() : null,
                    toAccount != null ? toAccount.getName() : null,
                    mapToCategoryDto(category),
                    null,
                    null,
                    null, // merchant
                    null  // tags
            );
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new VersionConflictException("Transaction has been modified by another process", 
                    request.getVersion(), transaction.getVersion() + 1);
        }
    }
    
    /**
     * Delete transaction (soft delete)
     */
    @Transactional
    public void deleteTransaction(UUID userId, UUID transactionId, Long version) {
        log.info("Deleting transaction: {}, user: {}", transactionId, userId);
        
        // Find transaction
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found: " + transactionId));
        
        // Check version
        if (version != null && !transaction.getVersion().equals(version)) {
            throw new VersionConflictException("Transaction has been modified by another process", 
                    version, transaction.getVersion());
        }
        
        // Soft delete
        transaction.markAsDeleted();
        transactionRepository.save(transaction);
        
        // Revert account balance changes
        revertAccountBalancesForTransaction(userId, transaction);

        // Unlink OCR receipt if linked so it no longer appears as a paid receipt in OCR history
        unlinkReceiptOnDelete(userId, transaction);
        
        // Sync Goal if this transaction was linked to a goal contribution or withdrawal
        syncLinkedGoalOnDelete(transaction);

        // Sync Debt Payment if linked
        syncLinkedDebtOnDelete(transaction);

        // Sync Group entities on transaction delete
        syncLinkedGroupOnDelete(transaction);

        // Sync Schedule occurrence on transaction delete
        syncLinkedScheduleOnDelete(transaction);
        
        log.info("Transaction deleted and balance reverted successfully: {}", transactionId);
    }

    private void revertAccountBalancesForTransaction(UUID userId, Transaction transaction) {
        if (transaction.getAccountId() == null) return;
        accountRepository.findByIdAndUserId(transaction.getAccountId(), userId).ifPresent(account -> {
            if (transaction.getType() == TransactionType.EXPENSE) {
                account.setBalance(account.getBalance().add(transaction.getAmount()));
                accountRepository.save(account);
            } else if (transaction.getType() == TransactionType.INCOME) {
                account.setBalance(account.getBalance().subtract(transaction.getAmount()));
                accountRepository.save(account);
            } else if (transaction.getType() == TransactionType.TRANSFER) {
                BigDecimal revertAmount = transaction.getAmount();
                if (transaction.getFeeAmount() != null) {
                    revertAmount = revertAmount.add(transaction.getFeeAmount());
                }
                account.setBalance(account.getBalance().add(revertAmount));
                accountRepository.save(account);

                if (transaction.getToAccountId() != null) {
                    accountRepository.findByIdAndUserId(transaction.getToAccountId(), userId).ifPresent(toAcc -> {
                        BigDecimal toAmount = transaction.getToAmount() != null ? transaction.getToAmount() : transaction.getAmount();
                        toAcc.setBalance(toAcc.getBalance().subtract(toAmount));
                        accountRepository.save(toAcc);
                    });
                }
            }
        });
    }

    private void applyAccountBalancesForTransaction(UUID userId, Transaction transaction) {
        if (transaction.getAccountId() == null) return;
        accountRepository.findByIdAndUserId(transaction.getAccountId(), userId).ifPresent(account -> {
            if (transaction.getType() == TransactionType.EXPENSE) {
                account.setBalance(account.getBalance().subtract(transaction.getAmount()));
                accountRepository.save(account);
            } else if (transaction.getType() == TransactionType.INCOME) {
                account.setBalance(account.getBalance().add(transaction.getAmount()));
                accountRepository.save(account);
            } else if (transaction.getType() == TransactionType.TRANSFER) {
                BigDecimal deductAmount = transaction.getAmount();
                if (transaction.getFeeAmount() != null) {
                    deductAmount = deductAmount.add(transaction.getFeeAmount());
                }
                account.setBalance(account.getBalance().subtract(deductAmount));
                accountRepository.save(account);

                if (transaction.getToAccountId() != null) {
                    accountRepository.findByIdAndUserId(transaction.getToAccountId(), userId).ifPresent(toAcc -> {
                        BigDecimal toAmount = transaction.getToAmount() != null ? transaction.getToAmount() : transaction.getAmount();
                        toAcc.setBalance(toAcc.getBalance().add(toAmount));
                        accountRepository.save(toAcc);
                    });
                }
            }
        });
    }

    private void syncLinkedReceiptOnUpdate(UUID userId, Transaction tx) {
        try {
            if (tx.getReceiptId() != null) {
                receiptRepository.findByIdAndUserId(tx.getReceiptId(), userId).ifPresent(r -> {
                    if (tx.getDescriptionRaw() != null && !tx.getDescriptionRaw().isBlank()) {
                        r.setMerchantName(tx.getDescriptionRaw().trim());
                    }
                    if (tx.getAmount() != null) {
                        r.setTotalAmount(tx.getAmount().longValue());
                    }
                    if (tx.getOccurredDate() != null) {
                        r.setTransactionDate(tx.getOccurredDate());
                    }
                    receiptRepository.save(r);
                });
            } else {
                receiptRepository.findByTransactionId(tx.getId()).ifPresent(r -> {
                    if (tx.getDescriptionRaw() != null && !tx.getDescriptionRaw().isBlank()) {
                        r.setMerchantName(tx.getDescriptionRaw().trim());
                    }
                    if (tx.getAmount() != null) {
                        r.setTotalAmount(tx.getAmount().longValue());
                    }
                    if (tx.getOccurredDate() != null) {
                        r.setTransactionDate(tx.getOccurredDate());
                    }
                    receiptRepository.save(r);
                });
            }
        } catch (Exception ignored) {
        }
    }

    private void unlinkReceiptOnDelete(UUID userId, Transaction tx) {
        try {
            if (tx.getReceiptId() != null) {
                receiptRepository.findByIdAndUserId(tx.getReceiptId(), userId).ifPresent(r -> {
                    r.setTransactionId(null);
                    r.setKind("draft");
                    receiptRepository.save(r);
                });
            }
            receiptRepository.findByTransactionId(tx.getId()).ifPresent(r -> {
                r.setTransactionId(null);
                r.setKind("draft");
                receiptRepository.save(r);
            });
        } catch (Exception ignored) {
        }
    }

    private void syncLinkedGoalOnUpdate(Transaction tx) {
        try {
            var contribOpt = goalContributionRepository.findByTransactionId(tx.getId());
            if (contribOpt.isEmpty()) {
                // Fallback cho các giao dịch rút/nạp tiền từ mục tiêu được tạo trước khi có cột transaction_id:
                // Tìm kiếm theo description hoặc note chứa tên mục tiêu
                String desc = tx.getDescriptionRaw() != null ? tx.getDescriptionRaw() : "";
                String note = tx.getNote() != null ? tx.getNote() : "";
                var allUserContribs = goalContributionRepository.findByUserId(tx.getUserId());
                for (var c : allUserContribs) {
                    if (c.getGoal() != null && (desc.contains(c.getGoal().getName()) || note.contains(c.getGoal().getName()))) {
                        c.setTransactionId(tx.getId());
                        goalContributionRepository.save(c);
                        contribOpt = java.util.Optional.of(c);
                        break;
                    }
                }
            }

            contribOpt.ifPresent(contrib -> {
                com.finance.finance.modules.goal.entity.Goal goal = contrib.getGoal();
                if (goal == null) return;

                // Hoàn lại lượng tiền cũ của contribution này khỏi goal
                BigDecimal oldSignedAmount = contrib.getAmount(); // có thể âm nếu là rút tiền
                BigDecimal currentGoalAmount = goal.getCurrentAmount() != null ? goal.getCurrentAmount() : BigDecimal.ZERO;
                BigDecimal baseAmountWithoutThis = currentGoalAmount.subtract(oldSignedAmount);

                // Tính toán lượng tiền mới theo loại giao dịch
                // Nếu giao dịch là INCOME (rút tiền từ mục tiêu về ví) -> contribution amount là số âm (-amount)
                // Nếu giao dịch là EXPENSE (đóng góp vào mục tiêu) -> contribution amount là số dương (+amount)
                BigDecimal newSignedAmount = tx.getType() == TransactionType.INCOME 
                        ? tx.getAmount().negate() 
                        : tx.getAmount();

                contrib.setAmount(newSignedAmount);
                if (tx.getNote() != null && !tx.getNote().isBlank()) {
                    contrib.setNote(tx.getNote());
                } else if (tx.getDescriptionRaw() != null && !tx.getDescriptionRaw().isBlank()) {
                    contrib.setNote(tx.getDescriptionRaw());
                }
                if (tx.getAccountId() != null) {
                    contrib.setSourceAccountId(tx.getAccountId());
                }
                goalContributionRepository.save(contrib);

                BigDecimal newGoalAmount = baseAmountWithoutThis.add(newSignedAmount);
                if (newGoalAmount.compareTo(BigDecimal.ZERO) < 0) {
                    newGoalAmount = BigDecimal.ZERO;
                }
                goal.setCurrentAmount(newGoalAmount);

                // Cập nhật lại status mục tiêu
                if (goal.getTargetAmount() != null && goal.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                    if (newGoalAmount.compareTo(goal.getTargetAmount()) >= 0) {
                        goal.setStatus(com.finance.finance.common.enums.GoalStatus.ACHIEVED);
                    } else if (goal.getStatus() == com.finance.finance.common.enums.GoalStatus.ACHIEVED) {
                        goal.setStatus(com.finance.finance.common.enums.GoalStatus.IN_PROGRESS);
                        goal.setCompletedAt(null);
                    }
                }
                goalRepository.save(goal);
                log.info("Synced Goal {} currentAmount to {} after Transaction {} update", goal.getId(), newGoalAmount, tx.getId());
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked goal on transaction update", ex);
        }
    }

    private void syncLinkedGoalOnDelete(Transaction tx) {
        try {
            var contribOpt = goalContributionRepository.findByTransactionId(tx.getId());
            if (contribOpt.isEmpty()) {
                String desc = tx.getDescriptionRaw() != null ? tx.getDescriptionRaw() : "";
                String note = tx.getNote() != null ? tx.getNote() : "";
                var allUserContribs = goalContributionRepository.findByUserId(tx.getUserId());
                for (var c : allUserContribs) {
                    if (c.getGoal() != null && (desc.contains(c.getGoal().getName()) || note.contains(c.getGoal().getName()))) {
                        contribOpt = java.util.Optional.of(c);
                        break;
                    }
                }
            }

            contribOpt.ifPresent(contrib -> {
                com.finance.finance.modules.goal.entity.Goal goal = contrib.getGoal();
                if (goal != null) {
                    BigDecimal signedAmount = contrib.getAmount();
                    BigDecimal currentGoalAmount = goal.getCurrentAmount() != null ? goal.getCurrentAmount() : BigDecimal.ZERO;
                    BigDecimal newGoalAmount = currentGoalAmount.subtract(signedAmount);
                    if (newGoalAmount.compareTo(BigDecimal.ZERO) < 0) {
                        newGoalAmount = BigDecimal.ZERO;
                    }
                    goal.setCurrentAmount(newGoalAmount);

                    if (goal.getTargetAmount() != null && goal.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                        if (newGoalAmount.compareTo(goal.getTargetAmount()) >= 0) {
                            goal.setStatus(com.finance.finance.common.enums.GoalStatus.ACHIEVED);
                        } else if (goal.getStatus() == com.finance.finance.common.enums.GoalStatus.ACHIEVED) {
                            goal.setStatus(com.finance.finance.common.enums.GoalStatus.IN_PROGRESS);
                            goal.setCompletedAt(null);
                        }
                    }
                    goalRepository.save(goal);
                    log.info("Reverted Goal {} currentAmount to {} after Transaction {} delete", goal.getId(), newGoalAmount, tx.getId());
                }
                goalContributionRepository.delete(contrib);
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked goal on transaction delete", ex);
        }
    }

    private void syncLinkedDebtOnUpdate(Transaction tx) {
        try {
            debtPaymentRepository.findByTransactionId(tx.getId()).ifPresent(payment -> {
                com.finance.finance.modules.debt.entity.Debt debt = payment.getDebt();
                if (debt == null) return;

                BigDecimal oldPaymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
                BigDecimal oldPrincipal = payment.getPrincipalPaid() != null ? payment.getPrincipalPaid() : oldPaymentAmount;
                BigDecimal oldInterest = payment.getInterestPaid() != null ? payment.getInterestPaid() : BigDecimal.ZERO;

                BigDecimal newAmount = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
                // Nếu khoản cũ toàn bộ là gốc hoặc có tỷ lệ, điều chỉnh gốc theo số tiền mới
                BigDecimal newPrincipal = newAmount;
                BigDecimal newInterest = BigDecimal.ZERO;
                if (oldPaymentAmount.compareTo(BigDecimal.ZERO) > 0 && oldInterest.compareTo(BigDecimal.ZERO) > 0) {
                    newInterest = oldInterest;
                    newPrincipal = newAmount.subtract(newInterest);
                    if (newPrincipal.compareTo(BigDecimal.ZERO) < 0) {
                        newPrincipal = BigDecimal.ZERO;
                        newInterest = newAmount;
                    }
                }

                payment.setAmount(newAmount);
                payment.setPrincipalPaid(newPrincipal);
                payment.setInterestPaid(newInterest);
                if (tx.getOccurredDate() != null) {
                    payment.setPaymentDate(tx.getOccurredDate());
                }
                if (tx.getAccountId() != null) {
                    payment.setAccountId(tx.getAccountId());
                }
                if (tx.getNote() != null && !tx.getNote().isBlank()) {
                    payment.setNote(tx.getNote());
                }
                debtPaymentRepository.save(payment);

                // Cập nhật lại paidAmount và interestPaid trong debt
                BigDecimal curPaid = debt.getPaidAmount() != null ? debt.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal curInterest = debt.getInterestPaid() != null ? debt.getInterestPaid() : BigDecimal.ZERO;

                BigDecimal updatedPaid = curPaid.subtract(oldPaymentAmount).add(newAmount);
                BigDecimal updatedInterest = curInterest.subtract(oldInterest).add(newInterest);

                debt.setPaidAmount(updatedPaid.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : updatedPaid);
                debt.setInterestPaid(updatedInterest.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : updatedInterest);
                debt.updateStatus();
                debtRepository.save(debt);
                log.info("Synced Debt {} after Transaction {} update", debt.getId(), tx.getId());
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked debt on transaction update", ex);
        }
    }

    private void syncLinkedDebtOnDelete(Transaction tx) {
        try {
            debtPaymentRepository.findByTransactionId(tx.getId()).ifPresent(payment -> {
                com.finance.finance.modules.debt.entity.Debt debt = payment.getDebt();
                if (debt != null) {
                    BigDecimal oldPaymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
                    BigDecimal oldInterest = payment.getInterestPaid() != null ? payment.getInterestPaid() : BigDecimal.ZERO;

                    BigDecimal curPaid = debt.getPaidAmount() != null ? debt.getPaidAmount() : BigDecimal.ZERO;
                    BigDecimal curInterest = debt.getInterestPaid() != null ? debt.getInterestPaid() : BigDecimal.ZERO;

                    BigDecimal updatedPaid = curPaid.subtract(oldPaymentAmount);
                    BigDecimal updatedInterest = curInterest.subtract(oldInterest);

                    debt.setPaidAmount(updatedPaid.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : updatedPaid);
                    debt.setInterestPaid(updatedInterest.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : updatedInterest);
                    debt.updateStatus();
                    debtRepository.save(debt);
                    log.info("Reverted Debt {} after Transaction {} delete", debt.getId(), tx.getId());
                }
                debtPaymentRepository.delete(payment);
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked debt on transaction delete", ex);
        }
    }

    private void syncLinkedGroupOnUpdate(Transaction tx) {
        try {
            // 1. Group expense
            groupExpenseRepository.findByPersonalTransactionId(tx.getId()).ifPresent(expense -> {
                if (tx.getAmount() != null) {
                    expense.setAmount(tx.getAmount());
                }
                if (tx.getDescriptionRaw() != null && !tx.getDescriptionRaw().isBlank()) {
                    expense.setDescription(tx.getDescriptionRaw());
                }
                if (tx.getOccurredDate() != null) {
                    expense.setExpenseDate(tx.getOccurredDate());
                }
                if (tx.getAccountId() != null) {
                    expense.setSourceAccountId(tx.getAccountId());
                }
                groupExpenseRepository.save(expense);
                log.info("Synced GroupExpense {} after Transaction {} update", expense.getId(), tx.getId());
            });

            // 2. Group fund contribution
            groupFundContributionRepository.findByPersonalTransactionId(tx.getId()).ifPresent(contrib -> {
                BigDecimal oldAmount = contrib.getAmount() != null ? contrib.getAmount() : BigDecimal.ZERO;
                BigDecimal newAmount = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
                contrib.setAmount(newAmount);
                if (tx.getOccurredDate() != null) {
                    contrib.setContributedAt(tx.getOccurredDate());
                }
                groupFundContributionRepository.save(contrib);

                if (contrib.getFundId() != null) {
                    groupFundRepository.findById(contrib.getFundId()).ifPresent(fund -> {
                        BigDecimal curBalance = fund.getBalance() != null ? fund.getBalance() : BigDecimal.ZERO;
                        BigDecimal newBalance = curBalance.subtract(oldAmount).add(newAmount);
                        fund.setBalance(newBalance.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newBalance);
                        groupFundRepository.save(fund);
                    });
                }
                log.info("Synced GroupFundContribution {} after Transaction {} update", contrib.getId(), tx.getId());
            });

            // 3. Group settlement
            groupSettlementRepository.findByOutgoingTransactionIdOrIncomingTransactionId(tx.getId(), tx.getId()).ifPresent(st -> {
                if (tx.getAmount() != null) {
                    st.setAmount(tx.getAmount());
                    groupSettlementRepository.save(st);
                }
                log.info("Synced GroupSettlement {} after Transaction {} update", st.getId(), tx.getId());
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked group on transaction update", ex);
        }
    }

    private void syncLinkedGroupOnDelete(Transaction tx) {
        try {
            groupExpenseRepository.findByPersonalTransactionId(tx.getId()).ifPresent(expense -> {
                expense.setPersonalTransactionId(null);
                groupExpenseRepository.save(expense);
            });

            groupFundContributionRepository.findByPersonalTransactionId(tx.getId()).ifPresent(contrib -> {
                BigDecimal amount = contrib.getAmount() != null ? contrib.getAmount() : BigDecimal.ZERO;
                if (contrib.getFundId() != null) {
                    groupFundRepository.findById(contrib.getFundId()).ifPresent(fund -> {
                        BigDecimal curBalance = fund.getBalance() != null ? fund.getBalance() : BigDecimal.ZERO;
                        BigDecimal newBalance = curBalance.subtract(amount);
                        fund.setBalance(newBalance.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newBalance);
                        groupFundRepository.save(fund);
                    });
                }
                groupFundContributionRepository.delete(contrib);
            });

            groupSettlementRepository.findByOutgoingTransactionIdOrIncomingTransactionId(tx.getId(), tx.getId()).ifPresent(st -> {
                if (tx.getId().equals(st.getOutgoingTransactionId())) {
                    st.setOutgoingTransactionId(null);
                }
                if (tx.getId().equals(st.getIncomingTransactionId())) {
                    st.setIncomingTransactionId(null);
                }
                groupSettlementRepository.save(st);
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked group on transaction delete", ex);
        }
    }

    private void syncLinkedScheduleOnUpdate(Transaction tx) {
        try {
            scheduleOccurrenceRepository.findByTransactionId(tx.getId()).ifPresent(occ -> {
                if (tx.getOccurredDate() != null) {
                    occ.setActualExecutionDate(tx.getOccurredDate());
                    scheduleOccurrenceRepository.save(occ);
                }
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked schedule on transaction update", ex);
        }
    }

    private void syncLinkedScheduleOnDelete(Transaction tx) {
        try {
            scheduleOccurrenceRepository.findByTransactionId(tx.getId()).ifPresent(occ -> {
                occ.setTransactionId(null);
                occ.setStatus(com.finance.finance.common.enums.OccurrenceStatus.PENDING);
                scheduleOccurrenceRepository.save(occ);
            });
        } catch (Exception ex) {
            log.error("Failed to sync linked schedule on transaction delete", ex);
        }
    }
    
    /**
     * Batch create transactions
     */
    @Transactional
    public BatchCreateResponse batchCreateTransactions(UUID userId, BatchCreateRequest request) {
        log.info("Batch creating {} transactions for user: {}", request.getTransactions().size(), userId);
        
        List<BatchCreateResponse.ResultItem> results = new ArrayList<>();
        int successful = 0;
        int failed = 0;
        
        for (int i = 0; i < request.getTransactions().size(); i++) {
            CreateTransactionRequest txRequest = request.getTransactions().get(i);
            
            try {
                TransactionResponse created = createTransaction(userId, txRequest);
                
                results.add(BatchCreateResponse.ResultItem.builder()
                        .index(i)
                        .status("SUCCESS")
                        .transactionId(created.getId())
                        .syncSeq(created.getSyncSeq())
                        .build());
                
                successful++;
            } catch (Exception e) {
                log.warn("Failed to create transaction at index {}: {}", i, e.getMessage());
                
                results.add(BatchCreateResponse.ResultItem.builder()
                        .index(i)
                        .status("FAILED")
                        .errorMessage(e.getMessage())
                        .build());
                
                failed++;
                
                // Stop if skipOnError is false
                if (!request.getSkipOnError()) {
                    break;
                }
            }
        }
        
        log.info("Batch create completed: {} successful, {} failed", successful, failed);
        
        return BatchCreateResponse.builder()
                .total(request.getTransactions().size())
                .successful(successful)
                .failed(failed)
                .results(results)
                .build();
    }
    
    /**
     * Split transaction
     */
    @Transactional
    public List<TransactionResponse> splitTransaction(UUID userId, UUID transactionId, SplitTransactionRequest request) {
        log.info("Splitting transaction: {}, into {} parts", transactionId, request.getSplits().size());
        
        // Find original transaction
        Transaction original = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found: " + transactionId));
        
        // Validate split amounts sum equals original amount
        BigDecimal totalSplitAmount = request.getSplits().stream()
                .map(SplitTransactionRequest.SplitItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (original.getAmount().compareTo(totalSplitAmount) != 0) {
            throw new BusinessException("Split amounts sum (" + totalSplitAmount + 
                    ") does not match original amount (" + original.getAmount() + ")");
        }
        
        // Create split transactions
        List<TransactionResponse> splitTransactions = new ArrayList<>();
        
        for (SplitTransactionRequest.SplitItem split : request.getSplits()) {
            Transaction splitTx = Transaction.builder()
                    .userId(userId)
                    .accountId(original.getAccountId())
                    .type(original.getType())
                    .amount(split.getAmount())
                    .currencyCode(original.getCurrencyCode())
                    .exchangeRate(original.getExchangeRate())
                    .baseAmount(split.getAmount().multiply(original.getExchangeRate()))
                    .occurredDate(original.getOccurredDate())
                    .occurredAt(original.getOccurredAt())
                    .descriptionRaw(split.getDescription())
                    .categoryId(split.getCategoryId())
                    .note(split.getNote())
                    .source(TransactionSource.MANUAL)
                    .categoryStatus(CategoryStatus.CONFIRMED)
                    .build();
            
            Transaction saved = transactionRepository.save(splitTx);
            splitTransactions.add(transactionMapper.toResponse(saved));
        }
        
        // Delete original if requested
        if (request.getDeleteOriginal()) {
            original.markAsDeleted();
            transactionRepository.save(original);
        }
        
        log.info("Transaction split completed: {} parts created", splitTransactions.size());
        
        return splitTransactions;
    }
    
    /**
     * Get transaction summary
     */
    @Transactional(readOnly = true)
    public TransactionSummaryResponse getTransactionSummary(UUID userId, LocalDate fromDate, LocalDate toDate, String groupBy) {
        return getTransactionSummary(userId, fromDate, toDate, groupBy, null);
    }

    @Transactional(readOnly = true)
    public TransactionSummaryResponse getTransactionSummary(UUID userId, LocalDate fromDate, LocalDate toDate, String groupBy, UUID accountId) {
        log.debug("Getting transaction summary for user: {}, from: {}, to: {}, account: {}", userId, fromDate, toDate, accountId);
        
        // Get summary data
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        Long transactionCount = 0L;
        try {
            Object raw = transactionRepository.getSummary(userId, fromDate, toDate, accountId, false);
            Object[] summaryData = null;
            if (raw instanceof Object[] arr) {
                if (arr.length > 0 && arr[0] instanceof Object[] nested) {
                    summaryData = nested;
                } else {
                    summaryData = arr;
                }
            }
            if (summaryData != null && summaryData.length >= 3) {
                totalIncome = toBigDecimal(summaryData[0]);
                totalExpense = toBigDecimal(summaryData[1]);
                if (summaryData[2] instanceof Number num) transactionCount = num.longValue();
            }
        } catch (Exception e) {
            log.warn("getSummary failed, fallback to defaults: {}", e.getMessage());
        }
        
        // Calculate net cash flow
        BigDecimal netCashFlow = totalIncome.subtract(totalExpense);
        
        // Calculate average daily expense
        long days = java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        BigDecimal averageDailyExpense = days > 0 ? totalExpense.divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        
        // Get largest expense
        List<Transaction> largestExpenses = transactionRepository.findLargestExpenses(
                userId, fromDate, toDate, accountId, PageRequest.of(0, 1));
        TransactionSummaryResponse.LargestExpenseDto largestExpense = null;
        if (!largestExpenses.isEmpty()) {
            Transaction largest = largestExpenses.get(0);
            largestExpense = TransactionSummaryResponse.LargestExpenseDto.builder()
                    .amount(largest.getAmount())
                    .description(largest.getDescriptionRaw())
                    .date(largest.getOccurredDate())
                    .build();
        }
        
        // Get most frequent category
        List<Object[]> frequentCategories = transactionRepository.getMostFrequentCategories(
                userId, fromDate, toDate, PageRequest.of(0, 1));
        TransactionSummaryResponse.MostFrequentCategoryDto mostFrequentCategory = null;
        if (!frequentCategories.isEmpty()) {
            Object[] categoryData = frequentCategories.get(0);
            UUID catId = (UUID) categoryData[0];
            String catName = catId != null ? categoryRepository.findById(catId).map(Category::getName).orElse("") : "";
            mostFrequentCategory = TransactionSummaryResponse.MostFrequentCategoryDto.builder()
                    .id(catId)
                    .name(catName)
                    .count(((Long) categoryData[1]).intValue())
                    .totalAmount(BigDecimal.ZERO)
                    .build();
        }
        
        // Build summary
        TransactionSummaryResponse.SummaryDto summary = TransactionSummaryResponse.SummaryDto.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netCashFlow(netCashFlow)
                .averageDailyExpense(averageDailyExpense)
                .transactionCount(transactionCount.intValue())
                .largestExpense(largestExpense)
                .mostFrequentCategory(mostFrequentCategory)
                .build();
        
        // Get by category
        List<Object[]> categoryData = transactionRepository.groupByCategory(
                userId, TransactionType.EXPENSE, fromDate, toDate, accountId, false);
        
        // Tính tổng thực tế của các danh mục để tỷ lệ phần trăm cộng lại luôn chuẩn 100%
        BigDecimal sumCategoryAmount = categoryData.stream()
                .map(data -> toBigDecimal(data[1]))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        final BigDecimal effectiveTotalExpense = sumCategoryAmount.compareTo(BigDecimal.ZERO) > 0
                ? sumCategoryAmount
                : (totalExpense != null ? totalExpense : BigDecimal.ZERO);
        
        List<TransactionSummaryResponse.CategoryItemDto> byCategory = categoryData.stream()
                .map(data -> {
                    UUID catId = (UUID) data[0];
                    String catName = catId != null ? categoryRepository.findById(catId).map(Category::getName).orElse("") : "";
                    BigDecimal amount = toBigDecimal(data[1]);
                    BigDecimal percentage = (effectiveTotalExpense.compareTo(BigDecimal.ZERO) > 0)
                            ? amount.divide(effectiveTotalExpense, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                            : BigDecimal.ZERO;
                    Number count = data[2] instanceof Number num ? num : 0;
                    BigDecimal avgAmount = toBigDecimal(data[3]);
                    return TransactionSummaryResponse.CategoryItemDto.builder()
                            .categoryId(catId)
                            .categoryName(catName)
                            .totalAmount(amount)
                            .percentage(percentage)
                            .transactionCount(count.intValue())
                            .averageAmount(avgAmount)
                            .build();
                })
                .toList();
        
        // Get by period (flow by day or month)
        List<TransactionSummaryResponse.PeriodItemDto> byPeriod = new ArrayList<>();
        try {
            boolean isDaily = "day".equalsIgnoreCase(groupBy);
            List<Object[]> flowData = isDaily 
                    ? transactionRepository.getDailyFlow(userId, fromDate, toDate, accountId, false)
                    : transactionRepository.getMonthlyFlow(userId, fromDate, toDate, accountId, false);
            for (Object[] item : flowData) {
                String dateStr = (String) item[0];
                BigDecimal inc = toBigDecimal(item[1]);
                BigDecimal exp = toBigDecimal(item[2]);
                Number count = (Number) item[3];
                byPeriod.add(TransactionSummaryResponse.PeriodItemDto.builder()
                        .date(dateStr)
                        .income(inc)
                        .expense(exp)
                        .net(inc.subtract(exp))
                        .transactionCount(count != null ? count.intValue() : 0)
                        .build());
            }
        } catch (Exception e) {
            log.warn("Failed to get flow for summary (groupBy: {}): {}", groupBy, e.getMessage());
        }
        
        return TransactionSummaryResponse.builder()
                .period(TransactionSummaryResponse.PeriodDto.builder()
                        .from(fromDate)
                        .to(toDate)
                        .groupBy(groupBy)
                        .build())
                .summary(summary)
                .byCategory(byCategory)
                .byPeriod(byPeriod)
                .currencyCode("VND") // TODO: Get from user's base currency
                .build();
    }
    
    // Private helper methods
    
    private void validateTransactionRequest(CreateTransactionRequest request) {
        TransactionType type = request.getTransactionType();
        
        // TRANSFER validation
        if (type == TransactionType.TRANSFER) {
            if (request.getToAccountId() == null) {
                throw new BusinessException("To account is required for TRANSFER");
            }
            if (request.getAccountId().equals(request.getToAccountId())) {
                throw new BusinessException("Cannot transfer to the same account");
            }
            if (request.getCategoryId() != null) {
                throw new BusinessException("Category must be null for TRANSFER");
            }
        }
        
        // INCOME/EXPENSE validation
        if (type == TransactionType.INCOME || type == TransactionType.EXPENSE) {
            if (request.getCategoryId() == null) {
                throw new BusinessException("Category is required for " + type);
            }
            if (request.getToAccountId() != null) {
                throw new BusinessException("To account must be null for " + type);
            }
        }
        
        // Date validation
        if (request.getTransactionDate().isAfter(LocalDate.now())) {
            throw new BusinessException("Transaction date cannot be in the future");
        }
    }
    
    private Transaction buildTransaction(UUID userId, CreateTransactionRequest request) {
        LocalTime time = request.getTransactionTime() != null ? 
                request.getTransactionTime() : LocalTime.now();
        
        LocalDateTime dateTime = LocalDateTime.of(request.getTransactionDate(), time);
        Instant occurredAt = dateTime.atZone(ZoneId.systemDefault()).toInstant();
        
        // Calculate base amount (assuming same currency for now)
        BigDecimal exchangeRate = BigDecimal.ONE; // TODO: Get real exchange rate
        BigDecimal baseAmount = request.getAmount().multiply(exchangeRate);
        
        // Build location JSON
        String locationJson = null;
        if (request.getLocation() != null) {
            locationJson = String.format("{\"latitude\":%s,\"longitude\":%s,\"address\":\"%s\"}",
                    request.getLocation().getLatitude(),
                    request.getLocation().getLongitude(),
                    request.getLocation().getAddress());
        }
        
        return Transaction.builder()
                .userId(userId)
                .accountId(request.getAccountId())
                .toAccountId(request.getToAccountId())
                .categoryId(request.getCategoryId())
                .merchantId(request.getMerchantId())
                .receiptId(request.getReceiptId())
                .receiptUrl(request.getReceiptUrl())
                .type(request.getTransactionType())
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .exchangeRate(exchangeRate)
                .baseAmount(baseAmount)
                .feeAmount(request.getTransferFee() != null ? request.getTransferFee() : BigDecimal.ZERO)
                .toAmount(request.getToAmount())
                .occurredDate(request.getTransactionDate())
                .occurredAt(occurredAt)
                .descriptionRaw(request.getDescription())
                .note(request.getNote())
                .source(TransactionSource.MANUAL)
                .isExcludedFromReport(request.getIsExcludedFromReport() != null ? request.getIsExcludedFromReport() : false)
                .location(locationJson)
                .categoryStatus(CategoryStatus.CONFIRMED)
                .build();
    }
    
    private void updateTransactionFields(Transaction transaction, UpdateTransactionRequest request) {
        if (request.getAccountId() != null) {
            transaction.setAccountId(request.getAccountId());
        }
        if (request.getToAccountId() != null) {
            transaction.setToAccountId(request.getToAccountId());
        }
        if (request.getAmount() != null) {
            transaction.setAmount(request.getAmount());
            transaction.setBaseAmount(request.getAmount().multiply(transaction.getExchangeRate()));
            if (transaction.getType() == TransactionType.TRANSFER) {
                transaction.setToAmount(request.getAmount());
            }
        }
        if (request.getDescription() != null) {
            transaction.setDescriptionRaw(request.getDescription());
        }
        if (request.getTransactionDate() != null) {
            transaction.setOccurredDate(request.getTransactionDate());
            
            LocalTime time = request.getTransactionTime() != null ? 
                    request.getTransactionTime() : transaction.getOccurredAt().atZone(ZoneId.systemDefault()).toLocalTime();
            
            LocalDateTime dateTime = LocalDateTime.of(request.getTransactionDate(), time);
            transaction.setOccurredAt(dateTime.atZone(ZoneId.systemDefault()).toInstant());
        } else if (request.getTransactionTime() != null && transaction.getOccurredDate() != null) {
            LocalDateTime dateTime = LocalDateTime.of(transaction.getOccurredDate(), request.getTransactionTime());
            transaction.setOccurredAt(dateTime.atZone(ZoneId.systemDefault()).toInstant());
        }
        if (request.getCategoryId() != null) {
            transaction.setCategoryId(request.getCategoryId());
        }
        if (request.getMerchantId() != null) {
            transaction.setMerchantId(request.getMerchantId());
        }
        if (request.getNote() != null) {
            transaction.setNote(request.getNote());
        }
        if (request.getIsExcludedFromReport() != null) {
            transaction.setExcludedFromReport(request.getIsExcludedFromReport());
        }
        if (request.getLocation() != null) {
            String locationJson = String.format("{\"latitude\":%s,\"longitude\":%s,\"address\":\"%s\"}",
                    request.getLocation().getLatitude(),
                    request.getLocation().getLongitude(),
                    request.getLocation().getAddress());
            transaction.setLocation(locationJson);
        }
    }
    
    private Pageable buildPageable(TransactionFilter filter) {
        Sort.Direction direction = filter.getSortOrder().equalsIgnoreCase("desc") ? 
                Sort.Direction.DESC : Sort.Direction.ASC;
        String primarySort = convertSortField(filter.getSortBy());
        
        Sort sort = Sort.by(direction, primarySort);
        if ("occurredDate".equals(primarySort)) {
            sort = sort.and(Sort.by(direction, "occurredAt"))
                       .and(Sort.by(direction, "createdAt"));
        }
        
        return PageRequest.of(filter.getPage() - 1, filter.getLimit(), sort);
    }

    private String convertSortField(String sortBy) {
        if (sortBy == null) return "occurredDate";
        return switch (sortBy) {
            case "transaction_date", "transactionDate", "occurred_date" -> "occurredDate";
            case "amount" -> "amount";
            case "created_at", "createdAt" -> "createdAt";
            default -> "occurredDate";
        };
    }
    
    private boolean hasFilters(TransactionFilter filter) {
        return filter.getFromDate() != null ||
               filter.getToDate() != null ||
               filter.getAccountId() != null ||
               filter.getCategoryId() != null ||
               filter.getMerchantId() != null ||
               filter.getTransactionType() != null ||
               filter.getMinAmount() != null ||
               filter.getMaxAmount() != null ||
               filter.getCategoryStatus() != null ||
               filter.getIsExcludedFromReport() != null;
    }
    
    private TransactionListResponse.SummaryDto calculateSummary(UUID userId, TransactionFilter filter) {
        LocalDate fromDate = filter.getFromDate() != null ? filter.getFromDate() : LocalDate.now().withDayOfMonth(1);
        LocalDate toDate = filter.getToDate() != null ? filter.getToDate() : LocalDate.now();
        
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        int transactionCount = 0;

        try {
            Object raw = transactionRepository.getSummary(userId, fromDate, toDate, filter.getAccountId(), filter.getIsExcludedFromReport());
            Object[] summaryData = null;
            if (raw instanceof Object[] arr) {
                if (arr.length > 0 && arr[0] instanceof Object[] nested) {
                    summaryData = nested;
                } else {
                    summaryData = arr;
                }
            }
            if (summaryData != null && summaryData.length >= 3) {
                if (summaryData[0] instanceof BigDecimal bd) totalIncome = bd;
                if (summaryData[1] instanceof BigDecimal bd) totalExpense = bd;
                if (summaryData[2] instanceof Number num) transactionCount = num.intValue();
            }
        } catch (Exception e) {
            log.warn("calculateSummary failed, fallback to defaults: {}", e.getMessage());
        }
        
        BigDecimal netCashFlow = totalIncome.subtract(totalExpense);
        
        return TransactionListResponse.SummaryDto.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netCashFlow(netCashFlow)
                .transactionCount(transactionCount)
                .build();
    }

    private BigDecimal toBigDecimal(Object obj) {
        if (obj == null) return BigDecimal.ZERO;
        if (obj instanceof BigDecimal bd) return bd;
        if (obj instanceof Number num) return BigDecimal.valueOf(num.doubleValue());
        try {
            return new BigDecimal(obj.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private TransactionResponse.CategoryDto mapToCategoryDto(Category category) {
        if (category == null) {
            return null;
        }
        return TransactionResponse.CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .color(category.getColor())
                .build();
    }

    private void checkAndTriggerBudgetAlert(UUID userId, UUID categoryId, String categoryName) {
        List<com.finance.finance.modules.budget.entity.BudgetItem> items =
                budgetItemRepository.findByUserIdAndCategoryId(userId, categoryId);

        if (items == null || items.isEmpty()) return;

        LocalDate today = LocalDate.now();
        for (com.finance.finance.modules.budget.entity.BudgetItem item : items) {
            com.finance.finance.modules.budget.entity.Budget budget = item.getBudget();
            if (budget == null || budget.getDeletedAt() != null) continue;
            if (today.isBefore(budget.getStartDate()) || today.isAfter(budget.getEndDate())) continue;

            BigDecimal totalSpent = transactionRepository.sumSpentByUserIdAndCategoryAndDateRange(
                    userId, categoryId, budget.getStartDate(), budget.getEndDate()
            );
            if (totalSpent == null) totalSpent = BigDecimal.ZERO;

            if (item.getAmount() != null && item.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                double pct = totalSpent.divide(item.getAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
                double threshold = item.getAlertThresholdPercentage() != null ? item.getAlertThresholdPercentage() : 80.0;

                if (pct >= 100.0) {
                    notificationService.createNotification(
                            userId,
                            com.finance.finance.common.enums.NotificationType.BUDGET_EXCEEDED,
                            com.finance.finance.common.enums.NotificationPriority.HIGH,
                            "⚠️ Vượt ngân sách: " + categoryName,
                            String.format("Bạn đã chi %,.0f VNĐ, vượt quá 100%% hạn mức ngân sách '%s' (%,.0f VNĐ). Hãy kiểm tra lại chi tiêu!",
                                    totalSpent.doubleValue(), categoryName, item.getAmount().doubleValue()),
                            "/budget",
                            "Xem ngân sách"
                    );
                } else if (pct >= threshold) {
                    notificationService.createNotification(
                            userId,
                            com.finance.finance.common.enums.NotificationType.BUDGET_ALERT,
                            com.finance.finance.common.enums.NotificationPriority.HIGH,
                            "Cảnh báo ngân sách: " + categoryName,
                            String.format("Bạn đã sử dụng %.0f%% ngân sách cho '%s' (%,.0f / %,.0f VNĐ). Hãy chú ý các khoản chi sắp tới!",
                                    pct, categoryName, totalSpent.doubleValue(), item.getAmount().doubleValue()),
                            "/budget",
                            "Xem ngân sách"
                    );
                }
            }
        }
    }

    /**
     * Upload an attachment/receipt image for a transaction.
     */
    @Transactional
    public TransactionResponse uploadAttachment(UUID userId, UUID transactionId, org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found: " + transactionId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Tập tin tải lên không được rỗng");
        }
        if (file.getSize() > 15L * 1024 * 1024) {
            throw new IllegalArgumentException("Dung lượng tập tin không được vượt quá 15MB");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }

        java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "receipts");
        java.nio.file.Files.createDirectories(uploadDir);

        String savedFilename = UUID.randomUUID() + "." + ext;
        java.nio.file.Path destPath = uploadDir.resolve(savedFilename);
        java.nio.file.Files.copy(file.getInputStream(), destPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        String receiptUrl = "/uploads/receipts/" + savedFilename;
        transaction.setReceiptUrl(receiptUrl);
        transactionRepository.save(transaction);
        log.info("Attached receipt image {} to transaction {}", receiptUrl, transactionId);

        Account account = transaction.getAccountId() != null ?
                accountRepository.findById(transaction.getAccountId()).orElse(null) : null;
        Account toAccount = transaction.getToAccountId() != null ?
                accountRepository.findById(transaction.getToAccountId()).orElse(null) : null;
        Category category = transaction.getCategoryId() != null ?
                categoryRepository.findById(transaction.getCategoryId()).orElse(null) : null;

        return transactionMapper.toResponse(
                transaction,
                account != null ? account.getName() : null,
                account != null ? account.getIcon() : null,
                toAccount != null ? toAccount.getName() : null,
                mapToCategoryDto(category),
                null,
                null,
                null, // merchant
                null  // tags
        );
    }
}
