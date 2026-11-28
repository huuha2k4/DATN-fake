package com.finance.finance.modules.group.scheduler;

import com.finance.finance.common.enums.CategoryKind;
import com.finance.finance.common.enums.SpendRequestStatus;
import com.finance.finance.common.enums.TransactionSource;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeeklyAllowanceScheduler {

    private final ChildWalletRepository walletRepository;
    private final ChildSpendRequestRepository spendRequestRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final GroupFundRepository groupFundRepository;
    private final GroupExpenseRepository groupExpenseRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Chạy mỗi ngày lúc 6:00 sáng để kiểm tra và cấp tiền tiêu vặt hàng tuần
     */
    @Scheduled(cron = "0 0 6 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void processWeeklyAllowances() {
        log.info("Starting weekly allowance processing job...");
        
        try {
            List<ChildWallet> dueWallets = walletRepository.findWalletsDueForAllowance();
            log.info("Found {} wallets due for allowance", dueWallets.size());
            
            int successCount = 0;
            int failedCount = 0;
            
            for (ChildWallet wallet : dueWallets) {
                try {
                    processAllowanceForWallet(wallet);
                    successCount++;
                } catch (Exception e) {
                    failedCount++;
                    log.error("Failed to process allowance for wallet {}: {}", 
                            wallet.getId(), e.getMessage(), e);
                }
            }
            
            log.info("Weekly allowance processing completed. Success: {}, Failed: {}", 
                    successCount, failedCount);
                    
        } catch (Exception e) {
            log.error("Error during weekly allowance processing: {}", e.getMessage(), e);
        }
    }

    private void processAllowanceForWallet(ChildWallet wallet) {
        BigDecimal allowanceAmount = wallet.getWeeklyAllowance();
        String source = wallet.getAllowanceSource();
        UUID sourceAccountId = wallet.getAllowanceAccountId();
        
        log.info("Processing allowance for wallet {} ({}): amount={}, source={}", 
                wallet.getId(), wallet.getChildName(), allowanceAmount, source);

        // Tìm category FAMILY cho giao dịch
        UUID familyCategory = categoryRepository.findByCode("FAMILY")
                .map(Category::getId)
                .orElseGet(() -> categoryRepository.findSystemCategories()
                        .stream()
                        .filter(c -> c.getKind() == CategoryKind.EXPENSE)
                        .findFirst()
                        .map(Category::getId)
                        .orElse(null));

        // Xử lý trừ tiền từ nguồn
        if ("GROUP_FUND".equalsIgnoreCase(source)) {
            processGroupFundAllowance(wallet, allowanceAmount, familyCategory);
        } else if ("PERSONAL_ACCOUNT".equalsIgnoreCase(source) && sourceAccountId != null) {
            processPersonalAccountAllowance(wallet, allowanceAmount, sourceAccountId, familyCategory);
        } else {
            log.warn("Invalid allowance source configuration for wallet {}: source={}, accountId={}", 
                    wallet.getId(), source, sourceAccountId);
            return;
        }

        // Cộng tiền vào ví bé
        wallet.setBalance(wallet.getBalance().add(allowanceAmount));
        
        // Tính ngày cấp tiền tiếp theo (sau 7 ngày)
        LocalDate nextDate = LocalDate.now().plusWeeks(1);
        wallet.setNextAllowanceDate(nextDate);
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Ghi lại lịch sử nhận tiền tiêu vặt vào ví bé
        ChildSpendRequest allowanceRecord = ChildSpendRequest.builder()
                .walletId(wallet.getId())
                .amount(allowanceAmount)
                .categoryId(familyCategory)
                .description("[INCOME_ALLOWANCE] Tiền tiêu vặt hàng tuần")
                .status(SpendRequestStatus.APPROVED)
                .respondedByUserId(null) // System auto
                .respondedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        spendRequestRepository.save(allowanceRecord);

        // Gửi thông báo cho bé (nếu có tài khoản)
        if (wallet.getUserId() != null) {
            try {
                notificationService.createNotification(
                        wallet.getUserId(),
                        com.finance.finance.common.enums.NotificationType.CHILD_MONEY_RECEIVED,
                        com.finance.finance.common.enums.NotificationPriority.NORMAL,
                        "Bạn nhận được tiền tiêu vặt tuần này! 💰",
                        "Tiền tiêu vặt hàng tuần " + String.format("%,d", allowanceAmount.longValue()) + 
                                "đ đã được cộng vào ví của bạn. Hãy chi tiêu hợp lý nhé!",
                        "/groups?groupId=" + wallet.getGroupId() + "&tab=CHILD_WALLETS&walletId=" + wallet.getId(),
                        "Xem ví của em"
                );
            } catch (Exception e) {
                log.warn("Failed to send allowance notification to child: {}", e.getMessage());
            }
        }

        log.info("Successfully processed allowance for wallet {}. Next allowance date: {}", 
                wallet.getId(), nextDate);
    }

    private void processGroupFundAllowance(ChildWallet wallet, BigDecimal amount, UUID categoryId) {
        GroupFund fund = groupFundRepository.findByGroupIdForUpdate(wallet.getGroupId())
                .orElseThrow(() -> new IllegalStateException(
                        "Nhóm chưa có quỹ chung để cấp tiền tiêu vặt cho ví " + wallet.getChildName()));
        
        if (fund.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException(
                    "Số dư quỹ nhóm không đủ để cấp tiền tiêu vặt cho " + wallet.getChildName());
        }
        
        fund.setBalance(fund.getBalance().subtract(amount));
        groupFundRepository.save(fund);

        // Ghi nhận khoản chi từ quỹ nhóm
        GroupExpense expense = GroupExpense.builder()
                .groupId(wallet.getGroupId())
                .description("Tiền tiêu vặt hàng tuần cho " + wallet.getChildName() + " (tự động)")
                .amount(amount)
                .currency("VND")
                .paidByUserId(null) // System auto
                .createdByUserId(null) // System auto
                .paymentSource("GROUP_FUND")
                .financialPurpose(com.finance.finance.common.enums.GroupExpensePurpose.FUND_EXPENSE)
                .categoryId(categoryId)
                .splitMethod(com.finance.finance.common.enums.SplitMethod.EQUAL)
                .expenseDate(LocalDate.now())
                .build();
        groupExpenseRepository.save(expense);
        
        log.info("Deducted {} from group fund for wallet {}", amount, wallet.getId());
    }

    private void processPersonalAccountAllowance(ChildWallet wallet, BigDecimal amount, 
                                                  UUID accountId, UUID categoryId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy ví nguồn để cấp tiền tiêu vặt cho " + wallet.getChildName()));
        
        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException(
                    "Số dư ví nguồn không đủ để cấp tiền tiêu vặt cho " + wallet.getChildName());
        }
        
        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        // Ghi nhận giao dịch chi tiêu của bố mẹ
        Transaction parentTx = Transaction.builder()
                .userId(account.getUserId())
                .accountId(account.getId())
                .categoryId(categoryId)
                .type(TransactionType.EXPENSE)
                .amount(amount)
                .currencyCode(account.getCurrencyCode())
                .exchangeRate(BigDecimal.ONE)
                .baseAmount(amount)
                .occurredAt(java.time.Instant.now())
                .occurredDate(LocalDate.now())
                .descriptionRaw("Tiền tiêu vặt hàng tuần cho " + wallet.getChildName() + " (tự động)")
                .source(TransactionSource.MANUAL)
                .build();
        transactionRepository.save(parentTx);
        
        log.info("Deducted {} from personal account {} for wallet {}", 
                amount, accountId, wallet.getId());
    }
}
