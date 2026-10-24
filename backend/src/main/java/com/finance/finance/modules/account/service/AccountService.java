package com.finance.finance.modules.account.service;

import com.finance.finance.common.enums.AccountType;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.account.dto.request.AdjustBalanceRequest;
import com.finance.finance.modules.account.dto.request.CreateAccountRequest;
import com.finance.finance.modules.account.dto.request.UpdateAccountRequest;
import com.finance.finance.modules.account.dto.response.*;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.exception.AccountHasTransactionsException;
import com.finance.finance.modules.account.exception.AccountNotFoundException;
import com.finance.finance.modules.account.exception.DuplicateAccountNameException;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Lấy danh sách các loại ví / tài khoản và cấu hình trường nhập liệu
     */
    public List<AccountTypeMetadataResponse> getAccountTypes() {
        return List.of(
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.CASH)
                        .name("Tiền mặt")
                        .description("Ví tiền mặt chi tiêu hàng ngày hoặc cất két")
                        .defaultIcon("💵")
                        .defaultColor("#4CAF50")
                        .isLiability(false)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance"))
                        .optionalFields(List.of("description", "color", "icon", "isIncludedInTotal"))
                        .build(),
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.BANK_ACCOUNT)
                        .name("Tài khoản ngân hàng / Thẻ ghi nợ")
                        .description("Tài khoản thanh toán, thẻ ghi nợ (Debit/ATM) tại các ngân hàng")
                        .defaultIcon("🏦")
                        .defaultColor("#2196F3")
                        .isLiability(false)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance"))
                        .optionalFields(List.of("bankId", "accountNumber", "cardNumberLast4", "description", "color", "icon", "isIncludedInTotal"))
                        .build(),
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.E_WALLET)
                        .name("Ví điện tử")
                        .description("Ví MoMo, ZaloPay, Viettel Money, ShopeePay...")
                        .defaultIcon("💳")
                        .defaultColor("#E91E63")
                        .isLiability(false)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance"))
                        .optionalFields(List.of("bankId", "phoneNumber", "description", "color", "icon", "isIncludedInTotal"))
                        .build(),
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.CREDIT_CARD)
                        .name("Thẻ tín dụng")
                        .description("Thẻ tín dụng (chi tiêu trước, trả sau)")
                        .defaultIcon("💳")
                        .defaultColor("#FF9800")
                        .isLiability(true)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance", "creditLimit", "billingCycleDay", "paymentDueDay"))
                        .optionalFields(List.of("bankId", "cardNumberLast4", "description", "color", "icon", "isIncludedInTotal"))
                        .build(),
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.INVESTMENT)
                        .name("Tài khoản đầu tư")
                        .description("Tài khoản chứng khoán, quỹ mở, vàng...")
                        .defaultIcon("📈")
                        .defaultColor("#9C27B0")
                        .isLiability(false)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance"))
                        .optionalFields(List.of("accountNumber", "description", "color", "icon", "isIncludedInTotal"))
                        .build(),
                AccountTypeMetadataResponse.builder()
                        .code(AccountType.CRYPTO)
                        .name("Ví tiền mã hóa")
                        .description("Ví Crypto, Binance, sàn giao dịch tài sản số")
                        .defaultIcon("🪙")
                        .defaultColor("#F59E0B")
                        .isLiability(false)
                        .requiredFields(List.of("name", "currencyCode", "initialBalance"))
                        .optionalFields(List.of("description", "color", "icon", "isIncludedInTotal"))
                        .build()
        );
    }

    /**
     * Tạo account mới
     */
    @Transactional
    public AccountResponse createAccount(UUID userId, CreateAccountRequest request) {
        log.info("Creating account for user: {}, name: {}", userId, request.getName());

        // Validate duplicate name
        if (accountRepository.existsByNameAndUserId(request.getName(), userId, null)) {
            throw new DuplicateAccountNameException(request.getName());
        }

        // Validate credit card fields
        if (AccountType.CREDIT_CARD.equals(request.getAccountType())) {
            if (request.getCreditLimit() == null || request.getCreditLimit().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Thẻ tín dụng phải có hạn mức > 0");
            }
            if (request.getBillingCycleDay() == null) {
                request.setBillingCycleDay(20); // Mặc định ngày 20 hàng tháng chốt sao kê
            }
            if (request.getPaymentDueDay() == null) {
                request.setPaymentDueDay(15); // Mặc định ngày 15 tháng kế tiếp đến hạn thanh toán
            }
        }

        // Get next display order
        Integer displayOrder = accountRepository.getNextDisplayOrder(userId);

        // Mask account number if provided
        String maskedNumber = null;
        if (request.getAccountNumber() != null && request.getAccountNumber().length() >= 4) {
            maskedNumber = "****" + request.getAccountNumber().substring(request.getAccountNumber().length() - 4);
        }

        UUID bankUuid = null;
        if (request.getBankId() != null && !request.getBankId().trim().isEmpty()) {
            try {
                bankUuid = UUID.fromString(request.getBankId().trim());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid bankId UUID format: {}", request.getBankId());
            }
        }

        // Build account entity
        Account account = Account.builder()
                .userId(userId)
                .name(request.getName())
                .accountType(request.getAccountType())
                .currencyCode(request.getCurrencyCode())
                .balance(request.getInitialBalance())
                .bankId(bankUuid)
                .accountNumber(request.getAccountNumber())
                .accountNumberMasked(maskedNumber)
                .phoneNumber(request.getPhoneNumber())
                .cardNumberLast4(request.getCardNumberLast4())
                .creditLimit(request.getCreditLimit())
                .billingCycleDay(request.getBillingCycleDay())
                .paymentDueDay(request.getPaymentDueDay())
                .icon(request.getIcon())
                .color(request.getColor())
                .description(request.getDescription())
                .displayOrder(displayOrder)
                .isIncludedInTotal(request.getIsIncludedInTotal())
                .isActive(true)
                .isSynced(false)
                .syncSeq(0L)
                .build();

        account = accountRepository.save(account);
        log.info("Account created successfully: {}", account.getId());

        return mapToResponse(account, false);
    }

    /**
     * Lấy danh sách accounts
     */
    @Transactional(readOnly = true)
    public AccountListResponse getAccounts(UUID userId, Boolean includeInactive, 
                                          AccountType accountType, String currencyCode) {
        log.info("Getting accounts for user: {}", userId);

        List<Account> accounts = accountRepository.findByUserIdWithFilters(
                userId, includeInactive, accountType, currencyCode);

        List<AccountResponse> accountResponses = accounts.stream()
                .map(account -> mapToResponse(account, false))
                .collect(Collectors.toList());

        // Calculate summary
        BigDecimal totalAssets = accountRepository.calculateTotalAssets(userId);
        BigDecimal totalLiabilities = accountRepository.calculateTotalLiabilities(userId);
        BigDecimal netWorth = accountRepository.calculateNetWorth(userId);

        AccountListResponse.AccountSummary summary = AccountListResponse.AccountSummary.builder()
                .totalAssets(totalAssets)
                .totalLiabilities(totalLiabilities)
                .netWorth(netWorth)
                .currencyCode("VND") // TODO: Get from user preferences
                .build();

        return AccountListResponse.builder()
                .accounts(accountResponses)
                .summary(summary)
                .build();
    }

    /**
     * Lấy chi tiết account
     */
    @Transactional(readOnly = true)
    public AccountResponse getAccountById(UUID userId, UUID accountId, Boolean includeStats) {
        log.info("Getting account detail: {} for user: {}", accountId, userId);

        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản"));

        return mapToResponse(account, includeStats != null && includeStats);
    }

    /**
     * Cập nhật account
     */
    @Transactional
    public AccountResponse updateAccount(UUID userId, UUID accountId, UpdateAccountRequest request) {
        log.info("Updating account: {} for user: {}", accountId, userId);

        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản"));

        // Check version for optimistic locking
        if (request.getVersion() != null && !account.getVersion().equals(request.getVersion())) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        // Validate duplicate name
        if (request.getName() != null && 
            !request.getName().equals(account.getName()) &&
            accountRepository.existsByNameAndUserId(request.getName(), userId, accountId)) {
            throw new DuplicateAccountNameException(request.getName());
        }

        // Update fields
        if (request.getName() != null) {
            account.setName(request.getName());
        }
        if (request.getIcon() != null) {
            account.setIcon(request.getIcon());
        }
        if (request.getColor() != null) {
            account.setColor(request.getColor());
        }
        if (request.getDescription() != null) {
            account.setDescription(request.getDescription());
        }
        if (request.getIsIncludedInTotal() != null) {
            account.setIsIncludedInTotal(request.getIsIncludedInTotal());
        }
        if (request.getIsActive() != null) {
            account.setIsActive(request.getIsActive());
        }
        if (request.getBalance() != null) {
            account.setBalance(request.getBalance());
        }

        // Update credit card fields
        if (account.isCreditCard()) {
            if (request.getCreditLimit() != null) {
                account.setCreditLimit(request.getCreditLimit());
            }
            if (request.getBillingCycleDay() != null) {
                account.setBillingCycleDay(request.getBillingCycleDay());
            }
            if (request.getPaymentDueDay() != null) {
                account.setPaymentDueDay(request.getPaymentDueDay());
            }
        }

        account = accountRepository.save(account);
        log.info("Account updated successfully: {}", accountId);

        return mapToResponse(account, false);
    }

    /**
     * Xóa account (soft delete)
     */
    @Transactional
    public void deleteAccount(UUID userId, UUID accountId, Integer version, UUID moveTransactionsTo) {
        log.info("Deleting account: {} for user: {}", accountId, userId);

        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản"));

        // Check version
        if (!account.getVersion().equals(version)) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        // Check if account has transactions
        Long transactionCount = accountRepository.countTransactionsByAccountId(accountId);
        
        if (transactionCount > 0) {
            if (moveTransactionsTo == null) {
                throw new AccountHasTransactionsException(transactionCount);
            }

            // Validate target account exists
            Account targetAccount = accountRepository.findByIdAndUserId(moveTransactionsTo, userId)
                    .orElseThrow(() -> new AccountNotFoundException("Tài khoản đích không tồn tại"));

            // Move transactions to target account
            transactionRepository.moveTransactionsToAccount(accountId, moveTransactionsTo);
            log.info("Moved {} transactions from account {} to {}", transactionCount, accountId, moveTransactionsTo);
        }

        // Soft delete
        account.softDelete();
        accountRepository.save(account);
        log.info("Account deleted successfully: {}", accountId);
    }

    /**
     * Lấy tổng quan tài sản
     */
    @Transactional(readOnly = true)
    public AccountSummaryResponse getAccountsSummary(UUID userId, String baseCurrency) {
        log.info("Getting accounts summary for user: {}", userId);

        // Calculate totals
        BigDecimal totalAssets = accountRepository.calculateTotalAssets(userId);
        BigDecimal totalLiabilities = accountRepository.calculateTotalLiabilities(userId);
        BigDecimal netWorth = accountRepository.calculateNetWorth(userId);

        AccountSummaryResponse.Summary summary = AccountSummaryResponse.Summary.builder()
                .totalAssets(totalAssets)
                .totalLiabilities(totalLiabilities)
                .netWorth(netWorth)
                .currencyCode(baseCurrency != null ? baseCurrency : "VND")
                .build();

        // Get summary by account type
        List<Object[]> byTypeData = accountRepository.getSummaryByAccountType(userId);
        List<AccountSummaryResponse.ByType> byType = byTypeData.stream()
                .map(row -> {
                    AccountType type = (AccountType) row[0];
                    Long count = ((Number) row[1]).longValue();
                    BigDecimal total = (BigDecimal) row[2];
                    Double percentage = netWorth.compareTo(BigDecimal.ZERO) == 0 ? 0.0 :
                            total.divide(netWorth, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100))
                                    .doubleValue();

                    return AccountSummaryResponse.ByType.builder()
                            .accountType(type)
                            .count(count.intValue())
                            .totalBalance(total)
                            .percentage(percentage)
                            .build();
                })
                .collect(Collectors.toList());

        // Get summary by currency
        List<Object[]> byCurrencyData = accountRepository.getSummaryByCurrency(userId);
        List<AccountSummaryResponse.ByCurrency> byCurrency = byCurrencyData.stream()
                .map(row -> AccountSummaryResponse.ByCurrency.builder()
                        .currencyCode((String) row[0])
                        .accountCount(((Number) row[1]).intValue())
                        .totalBalance((BigDecimal) row[2])
                        .totalBalanceInBase((BigDecimal) row[2]) // TODO: Currency conversion
                        .build())
                .collect(Collectors.toList());

        // Get net worth trend (last 30 days)
        // TODO: Implement actual trend calculation
        List<AccountSummaryResponse.NetWorthTrend> trends = new ArrayList<>();

        return AccountSummaryResponse.builder()
                .summary(summary)
                .byType(byType)
                .byCurrency(byCurrency)
                .netWorthTrend30Days(trends)
                .build();
    }

    /**
     * Điều chỉnh số dư
     */
    @Transactional
    public AdjustBalanceResponse adjustBalance(UUID userId, UUID accountId, AdjustBalanceRequest request) {
        log.info("Adjusting balance for account: {}", accountId);

        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản"));

        BigDecimal oldBalance = account.getBalance();
        BigDecimal adjustmentAmount = request.getNewBalance().subtract(oldBalance);

        account.setBalance(request.getNewBalance());
        account = accountRepository.save(account);

        UUID adjustmentTxId = null;
        try {
            // Attempt to create adjustment transaction if possible
            LocalDate adjustmentDate = request.getAdjustmentDate() != null ? 
                    request.getAdjustmentDate() : LocalDate.now();

            BigDecimal absAmount = adjustmentAmount.abs();
            if (absAmount.compareTo(BigDecimal.ZERO) > 0) {
                Transaction adjustmentTx = Transaction.builder()
                        .userId(userId)
                        .accountId(accountId)
                        .type(adjustmentAmount.compareTo(BigDecimal.ZERO) >= 0 ? 
                                TransactionType.INCOME : TransactionType.EXPENSE)
                        .amount(absAmount)
                        .baseAmount(absAmount)
                        .exchangeRate(BigDecimal.ONE)
                        .feeAmount(BigDecimal.ZERO)
                        .baseFee(BigDecimal.ZERO)
                        .currencyCode(account.getCurrencyCode())
                        .occurredDate(adjustmentDate)
                        .occurredAt(adjustmentDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant())
                        .note(request.getReason())
                        .descriptionRaw("Điều chỉnh số dư")
                        .source(com.finance.finance.common.enums.TransactionSource.MANUAL)
                        .build();

                adjustmentTx = transactionRepository.save(adjustmentTx);
                adjustmentTxId = adjustmentTx.getId();
                log.info("Balance adjusted and transaction created: {}", adjustmentTxId);
            }
        } catch (Exception e) {
            log.warn("Could not create adjustment transaction record: {}", e.getMessage());
        }

        return AdjustBalanceResponse.builder()
                .accountId(accountId)
                .oldBalance(oldBalance)
                .newBalance(request.getNewBalance())
                .adjustmentAmount(adjustmentAmount)
                .adjustmentTransactionId(adjustmentTxId)
                .reason(request.getReason())
                .build();
    }

    /**
     * Lấy lịch sử số dư
     */
    @Transactional(readOnly = true)
    public BalanceHistoryResponse getBalanceHistory(UUID userId, UUID accountId, 
                                                    LocalDate fromDate, LocalDate toDate, String interval) {
        log.info("Getting balance history for account: {} from {} to {}", accountId, fromDate, toDate);

        Account account = accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new AccountNotFoundException("Không tìm thấy tài khoản"));

        // Calculate starting balance
        BigDecimal startingBalance = calculateBalanceAtDate(account, fromDate);

        // Get balance history data
        List<Object[]> historyData = accountRepository.getBalanceHistory(
                accountId, fromDate, toDate, startingBalance);

        List<BalanceHistoryResponse.BalancePoint> balancePoints = new java.util.ArrayList<>();
        for (Object[] row : historyData) {
            balancePoints.add(BalanceHistoryResponse.BalancePoint.builder()
                    .date((LocalDate) row[0])
                    .balance((BigDecimal) row[2])
                    .income(BigDecimal.ZERO)
                    .expense(BigDecimal.ZERO)
                    .netChange((BigDecimal) row[1])
                    .build());
        }

        // Calculate summary
        BigDecimal endingBalance = account.getBalance();
        BalanceHistoryResponse.HistorySummary summary = BalanceHistoryResponse.HistorySummary.builder()
                .startingBalance(startingBalance)
                .endingBalance(endingBalance)
                .netChange(endingBalance.subtract(startingBalance))
                .totalIncome(BigDecimal.ZERO) // TODO
                .totalExpense(BigDecimal.ZERO) // TODO
                .highestBalance(startingBalance) // TODO
                .lowestBalance(startingBalance) // TODO
                .build();

        return BalanceHistoryResponse.builder()
                .account(BalanceHistoryResponse.AccountInfo.builder()
                        .id(accountId)
                        .name(account.getName())
                        .build())
                .period(BalanceHistoryResponse.Period.builder()
                        .from(fromDate)
                        .to(toDate)
                        .interval(interval != null ? interval : "day")
                        .build())
                .balanceHistory(balancePoints)
                .summary(summary)
                .build();
    }

    /**
     * Map Account entity to AccountResponse
     */
    private AccountResponse mapToResponse(Account account, boolean includeStats) {
        AccountResponse.AccountResponseBuilder builder = AccountResponse.builder()
                .id(account.getId())
                .name(account.getName())
                .accountType(account.getAccountType())
                .currencyCode(account.getCurrencyCode())
                .balance(account.getBalance())
                .displayBalance(formatBalance(account.getBalance(), account.getCurrencyCode()))
                .accountNumberMasked(account.getAccountNumberMasked())
                .phoneNumber(account.getPhoneNumber())
                .cardNumberLast4(account.getCardNumberLast4())
                .icon(account.getIcon())
                .color(account.getColor())
                .description(account.getDescription())
                .displayOrder(account.getDisplayOrder())
                .isIncludedInTotal(account.getIsIncludedInTotal())
                .isActive(account.getIsActive())
                .isSynced(account.getIsSynced())
                .lastSyncedAt(account.getLastSyncedAt())
                .syncSeq(account.getSyncSeq())
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .version(account.getVersion());

        // Add bank info if available
        if (account.getBankId() != null) {
            builder.bank(AccountResponse.BankInfo.builder()
                    .id(account.getBankId().toString())
                    .name(account.getBankId().toString()) // TODO: Get from bank service
                    .logoUrl(null) // TODO: Get from bank service
                    .build());
        }

        // Add credit card specific fields
        if (account.isCreditCard()) {
            builder.creditLimit(account.getCreditLimit())
                    .creditUsed(account.getCreditUsed())
                    .creditAvailable(account.getCreditAvailable())
                    .utilizationPercentage(account.getUtilizationPercentage())
                    .billingCycleDay(account.getBillingCycleDay())
                    .paymentDueDay(account.getPaymentDueDay())
                    .nextPaymentDue(calculateNextPaymentDue(account));
        }

        // Add statistics if requested
        if (includeStats) {
            Object[] statsData = accountRepository.getAccountStatistics(account.getId());
            if (statsData != null) {
                builder.stats(AccountResponse.AccountStats.builder()
                        .totalIncome((BigDecimal) statsData[0])
                        .totalExpense((BigDecimal) statsData[1])
                        .transactionCount(((Number) statsData[2]).intValue())
                        .averageTransaction((BigDecimal) statsData[3])
                        .largestIncome((BigDecimal) statsData[4])
                        .largestExpense((BigDecimal) statsData[5])
                        .firstTransactionDate((LocalDate) statsData[6])
                        .lastTransactionDate((LocalDate) statsData[7])
                        .build());
            }
        }

        return builder.build();
    }

    private String formatBalance(BigDecimal balance, String currencyCode) {
        NumberFormat formatter = NumberFormat.getInstance(new Locale("vi", "VN"));
        return formatter.format(balance) + " " + currencyCode;
    }

    private LocalDate calculateNextPaymentDue(Account account) {
        if (account.getPaymentDueDay() == null) return null;
        
        LocalDate today = LocalDate.now();
        LocalDate nextDue = LocalDate.of(today.getYear(), today.getMonth(), account.getPaymentDueDay());
        
        if (nextDue.isBefore(today)) {
            nextDue = nextDue.plusMonths(1);
        }
        
        return nextDue;
    }

    private BigDecimal calculateBalanceAtDate(Account account, LocalDate date) {
        // TODO: Calculate balance at specific date by summing transactions
        return account.getBalance();
    }
}
