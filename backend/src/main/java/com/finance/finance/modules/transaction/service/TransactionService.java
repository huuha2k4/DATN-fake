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
    
    /**
     * Create a new transaction
     */
    @Transactional
    public TransactionResponse createTransaction(UUID userId, CreateTransactionRequest request) {
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
        
        TransactionResponse.CategoryDto catDto = mapToCategoryDto(category);
        return transactionMapper.toResponse(
                saved,
                account.getName(),
                account.getIcon(),
                toAccount != null ? toAccount.getName() : null,
                catDto,
                balanceBefore,
                balanceAfter
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
                null
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
                            null
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
        
        // Check version for optimistic locking
        if (!transaction.getVersion().equals(request.getVersion())) {
            throw new VersionConflictException("Transaction has been modified by another process", 
                    request.getVersion(), transaction.getVersion());
        }
        
        // Update fields
        updateTransactionFields(transaction, request);
        
        try {
            // Save with optimistic locking
            Transaction updated = transactionRepository.save(transaction);
            log.info("Transaction updated successfully: {}", updated.getId());
            
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
                    null
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
        if (transaction.getAccountId() != null) {
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
        
        log.info("Transaction deleted and balance reverted successfully: {}", transactionId);
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
        log.debug("Getting transaction summary for user: {}, from: {}, to: {}", userId, fromDate, toDate);
        
        // Get summary data
        Object[] summaryData = transactionRepository.getSummary(userId, fromDate, toDate, false);
        BigDecimal totalIncome = (BigDecimal) summaryData[0];
        BigDecimal totalExpense = (BigDecimal) summaryData[1];
        Long transactionCount = (Long) summaryData[2];
        
        // Calculate net cash flow
        BigDecimal netCashFlow = totalIncome.subtract(totalExpense);
        
        // Calculate average daily expense
        long days = java.time.temporal.ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        BigDecimal averageDailyExpense = totalExpense.divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP);
        
        // Get largest expense
        List<Transaction> largestExpenses = transactionRepository.findLargestExpenses(
                userId, fromDate, toDate, PageRequest.of(0, 1));
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
                userId, TransactionType.EXPENSE, fromDate, toDate);
        
        List<TransactionSummaryResponse.CategoryItemDto> byCategory = categoryData.stream()
                .map(data -> {
                    UUID catId = (UUID) data[0];
                    String catName = catId != null ? categoryRepository.findById(catId).map(Category::getName).orElse("") : "";
                    return TransactionSummaryResponse.CategoryItemDto.builder()
                            .categoryId(catId)
                            .categoryName(catName)
                            .totalAmount((BigDecimal) data[1])
                            .percentage(((BigDecimal) data[1]).divide(totalExpense, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)))
                            .transactionCount(((Long) data[2]).intValue())
                            .averageAmount((BigDecimal) data[3])
                            .build();
                })
                .toList();
        
        return TransactionSummaryResponse.builder()
                .period(TransactionSummaryResponse.PeriodDto.builder()
                        .from(fromDate)
                        .to(toDate)
                        .groupBy(groupBy)
                        .build())
                .summary(summary)
                .byCategory(byCategory)
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
        if (request.getAmount() != null) {
            transaction.setAmount(request.getAmount());
            transaction.setBaseAmount(request.getAmount().multiply(transaction.getExchangeRate()));
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
            Object raw = transactionRepository.getSummary(userId, fromDate, toDate, filter.getIsExcludedFromReport());
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
}
