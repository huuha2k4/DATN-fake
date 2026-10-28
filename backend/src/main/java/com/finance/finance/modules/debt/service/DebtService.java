package com.finance.finance.modules.debt.service;

import com.finance.finance.common.enums.DebtStatus;
import com.finance.finance.common.enums.DebtType;
import com.finance.finance.common.enums.PaymentFrequency;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.debt.dto.request.CreateDebtRequest;
import com.finance.finance.modules.debt.dto.request.RecordPaymentRequest;
import com.finance.finance.modules.debt.dto.request.UpdateDebtRequest;
import com.finance.finance.modules.debt.dto.response.*;
import com.finance.finance.modules.debt.entity.Debt;
import com.finance.finance.modules.debt.entity.DebtPayment;
import com.finance.finance.modules.debt.exception.DebtNotFoundException;
import com.finance.finance.modules.debt.repository.DebtPaymentRepository;
import com.finance.finance.modules.debt.repository.DebtRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DebtService {

    private final DebtRepository debtRepository;
    private final DebtPaymentRepository debtPaymentRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;

    // ==================== CREATE DEBT ====================

    @Transactional
    public DebtResponse createDebt(UUID userId, CreateDebtRequest request) {
        log.info("Creating debt for user: {}, type: {}", userId, request.getDebtType());

        // Validate dates
        if (request.getDueDate() != null && request.getDueDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày đến hạn phải sau ngày bắt đầu");
        }

        // Parse DebtType from string
        DebtType debtType = DebtType.valueOf(request.getDebtType());

        // Validate debt type specific fields
        validateDebtTypeFields(request);

        // Get user entity
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Người dùng không tồn tại"));

        // Build debt entity
        Debt debt = Debt.builder()
                .user(user)
                .debtType(debtType)
                .creditorName(request.getCreditorName())
                .creditorPhone(request.getCreditorPhone())
                .creditorEmail(request.getCreditorEmail())
                .debtorName(request.getDebtorName())
                .debtorPhone(request.getDebtorPhone())
                .debtorEmail(request.getDebtorEmail())
                .principalAmount(request.getPrincipalAmount())
                .paidAmount(BigDecimal.ZERO)
                .interestPaid(BigDecimal.ZERO)
                .currencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : "VND")
                .interestRate(request.getInterestRate())
                .interestType(request.getInterestType())
                .paymentFrequency(request.getPaymentFrequency())
                .paymentAmount(request.getMonthlyPayment())
                .nextPaymentDate(request.getNextPaymentDate())
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .status(DebtStatus.ACTIVE)
                .accountId(request.getAccountId())
                .categoryId(request.getCategoryId())
                .reminderEnabled(request.getReminderEnabled() != null ? request.getReminderEnabled() : false)
                .reminderDaysBefore(request.getReminderDaysBefore())
                .description(request.getDescription())
                .note(request.getNote())
                .attachmentUrl(request.getAttachmentUrl())
                .build();

        // Calculate next payment date if not provided
        if (debt.getNextPaymentDate() == null && debt.getPaymentFrequency() != null) {
            debt.setNextPaymentDate(calculateNextPaymentDate(debt.getStartDate(), debt.getPaymentFrequency()));
        }

        debt = debtRepository.save(debt);
        log.info("Debt created: {}", debt.getId());

        return mapToDebtResponse(debt);
    }

    // ==================== GET DEBTS LIST ====================

    @Transactional(readOnly = true)
    public DebtListResponse getDebts(UUID userId, DebtType debtType, DebtStatus status) {
        log.info("Getting debts for user: {}, type: {}, status: {}", userId, debtType, status);

        List<Debt> debts;

        if (debtType != null && status != null) {
            debts = debtRepository.findByUserIdAndTypeAndStatus(userId, debtType, status);
        } else if (debtType != null) {
            debts = debtRepository.findByUserIdAndType(userId, debtType);
        } else if (status != null) {
            debts = debtRepository.findByUserIdAndStatus(userId, status);
        } else {
            debts = debtRepository.findAllByUserId(userId);
        }

        // Map to summary items
        List<DebtListResponse.DebtSummaryItem> items = debts.stream()
                .map(this::mapToSummaryItem)
                .collect(Collectors.toList());

        // Calculate summary
        BigDecimal totalBorrowing = calculateRemainingByType(userId, DebtType.BORROWING);
        BigDecimal totalLending = calculateRemainingByType(userId, DebtType.LENDING);
        BigDecimal netDebt = totalBorrowing.subtract(totalLending);

        DebtListResponse.Summary summary = DebtListResponse.Summary.builder()
                .totalBorrowing(totalBorrowing)
                .totalLending(totalLending)
                .netDebt(netDebt)
                .build();

        return DebtListResponse.builder()
                .debts(items)
                .summary(summary)
                .build();
    }

    // ==================== GET DEBT DETAIL ====================

    @Transactional(readOnly = true)
    public DebtDetailResponse getDebtById(UUID userId, UUID debtId) {
        log.info("Getting debt detail: {}", debtId);

        Debt debt = debtRepository.findByIdWithPayments(debtId, userId)
                .orElseThrow(() -> new DebtNotFoundException("Không tìm thấy khoản nợ"));

        return mapToDetailResponse(debt);
    }

    // ==================== UPDATE DEBT ====================

    @Transactional
    public DebtResponse updateDebt(UUID userId, UUID debtId, UpdateDebtRequest request) {
        log.info("Updating debt: {}", debtId);

        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new DebtNotFoundException("Không tìm thấy khoản nợ"));

        // Update fields
        if (request.getCreditorName() != null) debt.setCreditorName(request.getCreditorName());
        if (request.getCreditorPhone() != null) debt.setCreditorPhone(request.getCreditorPhone());
        if (request.getCreditorEmail() != null) debt.setCreditorEmail(request.getCreditorEmail());
        if (request.getDebtorName() != null) debt.setDebtorName(request.getDebtorName());
        if (request.getDebtorPhone() != null) debt.setDebtorPhone(request.getDebtorPhone());
        if (request.getDebtorEmail() != null) debt.setDebtorEmail(request.getDebtorEmail());
        if (request.getInterestRate() != null) debt.setInterestRate(request.getInterestRate());
        if (request.getInterestType() != null) debt.setInterestType(request.getInterestType());
        if (request.getPaymentFrequency() != null) debt.setPaymentFrequency(request.getPaymentFrequency());
        if (request.getPaymentAmount() != null) debt.setPaymentAmount(request.getPaymentAmount());
        if (request.getNextPaymentDate() != null) debt.setNextPaymentDate(request.getNextPaymentDate());
        if (request.getDueDate() != null) debt.setDueDate(request.getDueDate());
        if (request.getAccountId() != null) debt.setAccountId(request.getAccountId());
        if (request.getCategoryId() != null) debt.setCategoryId(request.getCategoryId());
        if (request.getReminderEnabled() != null) debt.setReminderEnabled(request.getReminderEnabled());
        if (request.getReminderDaysBefore() != null) debt.setReminderDaysBefore(request.getReminderDaysBefore());
        if (request.getDescription() != null) debt.setDescription(request.getDescription());
        if (request.getNote() != null) debt.setNote(request.getNote());
        if (request.getAttachmentUrl() != null) debt.setAttachmentUrl(request.getAttachmentUrl());

        // Update status based on remaining amount and due date
        debt.updateStatus();

        debt = debtRepository.save(debt);
        log.info("Debt updated: {}", debt.getId());

        return mapToDebtResponse(debt);
    }

    // ==================== DELETE DEBT ====================

    @Transactional
    public void deleteDebt(UUID userId, UUID debtId) {
        log.info("Deleting debt: {}", debtId);

        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new DebtNotFoundException("Không tìm thấy khoản nợ"));

        // Soft delete
        debt.softDelete();
        debtRepository.save(debt);

        log.info("Debt deleted (soft): {}", debtId);
    }

    // ==================== RECORD PAYMENT ====================

    @Transactional
    public PaymentResponse recordPayment(UUID userId, UUID debtId, RecordPaymentRequest request) {
        log.info("Recording payment for debt: {}, amount: {}", debtId, request.getAmount());

        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new DebtNotFoundException("Không tìm thấy khoản nợ"));

        // Validate payment amount
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền trả phải lớn hơn 0");
        }

        BigDecimal principalPaid = request.getPrincipalPaid() != null 
                ? request.getPrincipalPaid() 
                : request.getAmount();
        
        BigDecimal interestPaid = request.getInterestPaid() != null 
                ? request.getInterestPaid() 
                : BigDecimal.ZERO;

        // Validate breakdown
        BigDecimal total = principalPaid.add(interestPaid);
        if (total.compareTo(request.getAmount()) != 0) {
            throw new IllegalArgumentException("Tổng gốc + lãi phải bằng tổng số tiền trả");
        }

        // Create EXPENSE transaction for debt payment
        // This will deduct money from the account and record it in transaction history
        UUID transactionId = null;
        if (request.getAccountId() != null) {
            // Get account to retrieve currency code
            Account account = accountRepository.findByIdAndUserId(request.getAccountId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));
            
            // Find debt payment category dynamically by code, fallback to first available expense category
            UUID debtPaymentCategoryId = categoryRepository.findByCode("DEBT_PAYMENT")
                    .map(Category::getId)
                    .orElseGet(() -> categoryRepository.findByUserIdOrSystemAndKind(userId, com.finance.finance.common.enums.CategoryKind.EXPENSE)
                            .stream()
                            .findFirst()
                            .map(Category::getId)
                            .orElseThrow(() -> new IllegalStateException("Không tìm thấy danh mục chi tiêu hợp lệ")));
            
            // Get counterparty name based on debt type
            String counterpartyName = debt.getDebtType() == DebtType.BORROWING 
                    ? debt.getCreditorName()  // I owe this person (borrowing)
                    : debt.getDebtorName();   // This person owes me (lending)
            
            String description = debt.getDebtType() == DebtType.BORROWING 
                    ? "Trả nợ: " + (counterpartyName != null ? counterpartyName : "")
                    : "Thu nợ từ: " + (counterpartyName != null ? counterpartyName : "");
            
            CreateTransactionRequest transactionRequest = CreateTransactionRequest.builder()
                    .accountId(request.getAccountId())
                    .categoryId(debtPaymentCategoryId)
                    .transactionType(TransactionType.EXPENSE)
                    .amount(request.getAmount())
                    .currencyCode(account.getCurrencyCode())
                    .transactionDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now())
                    .description(description)
                    .note(request.getNote())
                    .build();
            
            transactionId = transactionService.createTransaction(userId, transactionRequest).getId();
        }

        // Create payment record
        DebtPayment payment = DebtPayment.builder()
                .debt(debt)
                .amount(request.getAmount())
                .principalPaid(principalPaid)
                .interestPaid(interestPaid)
                .paymentDate(request.getPaymentDate() != null ? request.getPaymentDate() : LocalDate.now())
                .paymentMethod(request.getPaymentMethod())
                .accountId(request.getAccountId())
                .transactionId(transactionId)
                .note(request.getNote())
                .build();

        payment = debtPaymentRepository.save(payment);

        // Update debt amounts
        debt.recordPayment(request.getAmount(), principalPaid, interestPaid);

        // Update next payment date
        if (debt.getPaymentFrequency() != null && debt.getNextPaymentDate() != null) {
            debt.setNextPaymentDate(calculateNextPaymentDate(debt.getNextPaymentDate(), debt.getPaymentFrequency()));
        }

        debtRepository.save(debt);

        log.info("Payment recorded: {}", payment.getId());

        // Send debt payment notification
        try {
            if (debt.getStatus() == DebtStatus.PAID_OFF) {
                String counterparty = debt.getDebtType() == DebtType.BORROWING ? debt.getCreditorName() : debt.getDebtorName();
                notificationService.createNotification(
                        userId,
                        com.finance.finance.common.enums.NotificationType.DEBT_REMINDER,
                        com.finance.finance.common.enums.NotificationPriority.NORMAL,
                        "🎉 Khoản nợ đã được tất toán thành công!",
                        String.format("Khoản %s với %s đã hoàn tất 100%% dư nợ. Chúc mừng bạn đã thanh toán xong!",
                                debt.getDebtType() == DebtType.BORROWING ? "vay" : "cho vay",
                                counterparty != null ? counterparty : ""),
                        "/debts",
                        "Xem công nợ"
                );
            }
        } catch (Exception ex) {
            log.error("Failed to send debt payment notification", ex);
        }

        // Build response
        return PaymentResponse.builder()
                .paymentId(payment.getId())
                .debtId(debt.getId())
                .amount(payment.getAmount())
                .principalPaid(payment.getPrincipalPaid())
                .interestPaid(payment.getInterestPaid())
                .newRemaining(debt.getRemainingAmount())
                .newPercentagePaid(debt.getPercentagePaid())
                .transactionId(payment.getTransactionId())
                .paymentDate(payment.getPaymentDate())
                .build();
    }

    // ==================== GET PAYMENT SCHEDULE ====================

    @Transactional(readOnly = true)
    public ScheduleResponse getPaymentSchedule(UUID userId, UUID debtId) {
        log.info("Getting payment schedule for debt: {}", debtId);

        Debt debt = debtRepository.findByIdWithPayments(debtId, userId)
                .orElseThrow(() -> new DebtNotFoundException("Không tìm thấy khoản nợ"));

        // Build debt info
        ScheduleResponse.DebtInfo debtInfo = ScheduleResponse.DebtInfo.builder()
                .id(debt.getId())
                .creditorName(debt.isBorrowing() ? debt.getCreditorName() : debt.getDebtorName())
                .principalAmount(debt.getPrincipalAmount())
                .build();

        // Generate schedule
        List<ScheduleResponse.ScheduleItem> schedule = generatePaymentSchedule(debt);

        // Calculate summary
        int totalPayments = schedule.size();
        int completedPayments = (int) schedule.stream()
                .filter(item -> "PAID".equals(item.getStatus()))
                .count();

        BigDecimal totalToPay = schedule.stream()
                .map(ScheduleResponse.ScheduleItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPrincipal = schedule.stream()
                .map(ScheduleResponse.ScheduleItem::getPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalInterest = schedule.stream()
                .map(ScheduleResponse.ScheduleItem::getInterest)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ScheduleResponse.ScheduleSummary summary = ScheduleResponse.ScheduleSummary.builder()
                .totalPayments(totalPayments)
                .completedPayments(completedPayments)
                .totalToPay(totalToPay)
                .totalPrincipal(totalPrincipal)
                .totalInterest(totalInterest)
                .build();

        return ScheduleResponse.builder()
                .debt(debtInfo)
                .schedule(schedule)
                .summary(summary)
                .build();
    }

    // ==================== GET DEBTS SUMMARY ====================

    @Transactional(readOnly = true)
    public SummaryResponse getSummary(UUID userId) {
        log.info("Getting debts summary for user: {}", userId);

        // Get borrowing summary
        SummaryResponse.DebtTypeSummary borrowing = calculateTypeSummary(userId, DebtType.BORROWING);

        // Get lending summary
        SummaryResponse.DebtTypeSummary lending = calculateTypeSummary(userId, DebtType.LENDING);

        // Calculate net position
        BigDecimal netDebt = borrowing.getTotalRemaining().subtract(lending.getTotalRemaining());
        
        // For debt_to_asset_ratio, we would need total assets from accounts
        // For now, set to null or calculate if accounts data is available
        SummaryResponse.NetPosition netPosition = SummaryResponse.NetPosition.builder()
                .netDebt(netDebt)
                .debtToAssetRatio(null) // Would need accounts module integration
                .build();

        // Get upcoming payments (next 30 days)
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(30);
        List<Debt> upcomingDebts = debtRepository.findUpcomingPayments(userId, today, futureDate);

        List<SummaryResponse.UpcomingPayment> upcomingPayments = upcomingDebts.stream()
                .map(debt -> SummaryResponse.UpcomingPayment.builder()
                        .debtId(debt.getId())
                        .creditorName(debt.getRelatedPartyName())
                        .amount(debt.getPaymentAmount())
                        .dueDate(debt.getNextPaymentDate())
                        .daysUntil((int) ChronoUnit.DAYS.between(today, debt.getNextPaymentDate()))
                        .build())
                .sorted(Comparator.comparing(SummaryResponse.UpcomingPayment::getDueDate))
                .collect(Collectors.toList());

        return SummaryResponse.builder()
                .borrowing(borrowing)
                .lending(lending)
                .netPosition(netPosition)
                .upcomingPayments(upcomingPayments)
                .build();
    }

    // ==================== HELPER METHODS ====================

    private void validateDebtTypeFields(CreateDebtRequest request) {
        DebtType debtType = DebtType.valueOf(request.getDebtType());
        
        if (DebtType.BORROWING.equals(debtType)) {
            if (request.getCreditorName() == null || request.getCreditorName().isBlank()) {
                throw new IllegalArgumentException("Tên người cho vay là bắt buộc khi loại nợ là BORROWING");
            }
        } else if (DebtType.LENDING.equals(debtType)) {
            if (request.getDebtorName() == null || request.getDebtorName().isBlank()) {
                throw new IllegalArgumentException("Tên người đi vay là bắt buộc khi loại nợ là LENDING");
            }
        }
    }

    private LocalDate calculateNextPaymentDate(LocalDate startDate, PaymentFrequency frequency) {
        LocalDate today = LocalDate.now();
        LocalDate nextDate = startDate;

        // If start date is in the past, find the next payment date from today
        while (!nextDate.isAfter(today)) {
            nextDate = switch (frequency) {
                case WEEKLY -> nextDate.plusWeeks(1);
                case BIWEEKLY -> nextDate.plusWeeks(2);
                case MONTHLY -> nextDate.plusMonths(1);
                case QUARTERLY -> nextDate.plusMonths(3);
                case YEARLY -> nextDate.plusYears(1);
                case ONE_TIME -> nextDate; // Don't advance
            };

            // Prevent infinite loop for ONE_TIME
            if (PaymentFrequency.ONE_TIME.equals(frequency)) {
                break;
            }
        }

        return nextDate;
    }

    private BigDecimal calculateRemainingByType(UUID userId, DebtType type) {
        return debtRepository.calculateTotalRemainingByTypeAndStatus(userId, type, DebtStatus.ACTIVE);
    }

    private SummaryResponse.DebtTypeSummary calculateTypeSummary(UUID userId, DebtType type) {
        Long totalCount = debtRepository.countByTypeAndStatus(userId, type, null);
        Long activeCount = debtRepository.countByTypeAndStatus(userId, type, DebtStatus.ACTIVE);
        
        BigDecimal totalPrincipal = debtRepository.calculateTotalPrincipalByType(userId, type);
        BigDecimal totalPaid = debtRepository.calculateTotalPaidByType(userId, type);
        BigDecimal totalInterestPaid = debtRepository.calculateTotalInterestPaidByType(userId, type);
        BigDecimal totalRemaining = debtRepository.calculateTotalRemainingByTypeAndStatus(userId, type, DebtStatus.ACTIVE);

        BigDecimal monthlyPayment = null;
        if (DebtType.BORROWING.equals(type)) {
            monthlyPayment = debtRepository.calculateTotalMonthlyPayment(userId);
        }

        return SummaryResponse.DebtTypeSummary.builder()
                .totalCount(totalCount.intValue())
                .activeCount(activeCount.intValue())
                .totalPrincipal(totalPrincipal)
                .totalPaid(totalPaid)
                .totalRemaining(totalRemaining)
                .monthlyPayment(monthlyPayment)
                .totalInterestPaid(totalInterestPaid)
                .build();
    }

    private List<ScheduleResponse.ScheduleItem> generatePaymentSchedule(Debt debt) {
        List<ScheduleResponse.ScheduleItem> schedule = new ArrayList<>();

        if (debt.getPaymentFrequency() == null || debt.getPaymentAmount() == null) {
            return schedule; // No schedule if frequency or amount not set
        }

        BigDecimal remaining = debt.getRemainingAmount();
        LocalDate currentDate = debt.getNextPaymentDate() != null 
                ? debt.getNextPaymentDate() 
                : debt.getStartDate();
        
        int paymentNumber = debt.getPayments().size() + 1;
        int maxPayments = 1000; // Safety limit

        while (remaining.compareTo(BigDecimal.ZERO) > 0 && paymentNumber <= maxPayments) {
            // Calculate interest for this period
            BigDecimal interestForPeriod = calculateInterestForPeriod(
                    remaining, 
                    debt.getInterestRate(), 
                    debt.getPaymentFrequency()
            );

            BigDecimal paymentAmount = debt.getPaymentAmount();
            BigDecimal principalPayment = paymentAmount.subtract(interestForPeriod);

            // Last payment adjustment
            if (principalPayment.compareTo(remaining) > 0) {
                principalPayment = remaining;
                paymentAmount = principalPayment.add(interestForPeriod);
            }

            BigDecimal remainingAfter = remaining.subtract(principalPayment);

            // Determine status
            String status = currentDate.isBefore(LocalDate.now()) ? "OVERDUE" : "PENDING";

            schedule.add(ScheduleResponse.ScheduleItem.builder()
                    .paymentNumber(paymentNumber)
                    .dueDate(currentDate)
                    .amount(paymentAmount)
                    .principal(principalPayment)
                    .interest(interestForPeriod)
                    .remainingAfter(remainingAfter)
                    .status(status)
                    .build());

            remaining = remainingAfter;
            currentDate = calculateNextPaymentDate(currentDate, debt.getPaymentFrequency());
            paymentNumber++;

            // Break if we've reached or passed the due date
            if (debt.getDueDate() != null && currentDate.isAfter(debt.getDueDate())) {
                break;
            }
        }

        return schedule;
    }

    private BigDecimal calculateInterestForPeriod(BigDecimal principal, BigDecimal annualRate, PaymentFrequency frequency) {
        if (annualRate == null || annualRate.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        // Convert annual rate to period rate
        BigDecimal periodsPerYear = switch (frequency) {
            case WEEKLY -> BigDecimal.valueOf(52);
            case BIWEEKLY -> BigDecimal.valueOf(26);
            case MONTHLY -> BigDecimal.valueOf(12);
            case QUARTERLY -> BigDecimal.valueOf(4);
            case YEARLY -> BigDecimal.valueOf(1);
            case ONE_TIME -> BigDecimal.valueOf(1);
        };

        BigDecimal periodRate = annualRate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)
                .divide(periodsPerYear, 10, RoundingMode.HALF_UP);

        return principal.multiply(periodRate).setScale(2, RoundingMode.HALF_UP);
    }

    // ==================== MAPPING METHODS ====================

    private DebtResponse mapToDebtResponse(Debt debt) {
        return DebtResponse.builder()
                .id(debt.getId())
                .debtType(debt.getDebtType())
                .creditorName(debt.getCreditorName())
                .debtorName(debt.getDebtorName())
                .principalAmount(debt.getPrincipalAmount())
                .paidAmount(debt.getPaidAmount())
                .remainingAmount(debt.getRemainingAmount())
                .percentagePaid(debt.getPercentagePaid())
                .interestRate(debt.getInterestRate())
                .status(debt.getStatus())
                .startDate(debt.getStartDate())
                .dueDate(debt.getDueDate())
                .monthsRemaining(debt.getMonthsRemaining())
                .createdAt(debt.getCreatedAt())
                .build();
    }

    private DebtListResponse.DebtSummaryItem mapToSummaryItem(Debt debt) {
        return DebtListResponse.DebtSummaryItem.builder()
                .id(debt.getId())
                .debtType(debt.getDebtType())
                .creditorName(debt.getCreditorName())
                .debtorName(debt.getDebtorName())
                .principalAmount(debt.getPrincipalAmount())
                .paidAmount(debt.getPaidAmount())
                .remaining(debt.getRemainingAmount())
                .percentagePaid(debt.getPercentagePaid())
                .status(debt.getStatus())
                .dueDate(debt.getDueDate())
                .nextPaymentDate(debt.getNextPaymentDate())
                .nextPaymentAmount(debt.getPaymentAmount())
                .build();
    }

    private DebtDetailResponse mapToDetailResponse(Debt debt) {
        // Map account info (if available)
        DebtDetailResponse.AccountInfo accountInfo = null;
        if (debt.getAccountId() != null) {
            accountInfo = DebtDetailResponse.AccountInfo.builder()
                    .id(debt.getAccountId())
                    .name("Account") // Would need accounts module integration
                    .build();
        }

        // Map category info (if available)
        DebtDetailResponse.CategoryInfo categoryInfo = null;
        if (debt.getCategoryId() != null) {
            categoryInfo = DebtDetailResponse.CategoryInfo.builder()
                    .id(debt.getCategoryId())
                    .name("Category") // Would need categories module integration
                    .build();
        }

        // Map payment history
        List<DebtDetailResponse.PaymentHistoryItem> paymentHistory = debt.getPayments().stream()
                .map(payment -> DebtDetailResponse.PaymentHistoryItem.builder()
                        .id(payment.getId())
                        .amount(payment.getAmount())
                        .principalPaid(payment.getPrincipalPaid())
                        .interestPaid(payment.getInterestPaid())
                        .paymentDate(payment.getPaymentDate())
                        .paymentMethod(payment.getPaymentMethod())
                        .note(payment.getNote())
                        .build())
                .collect(Collectors.toList());

        return DebtDetailResponse.builder()
                .id(debt.getId())
                .debtType(debt.getDebtType())
                .creditorName(debt.getCreditorName())
                .creditorPhone(debt.getCreditorPhone())
                .creditorEmail(debt.getCreditorEmail())
                .debtorName(debt.getDebtorName())
                .debtorPhone(debt.getDebtorPhone())
                .debtorEmail(debt.getDebtorEmail())
                .principalAmount(debt.getPrincipalAmount())
                .paidAmount(debt.getPaidAmount())
                .remainingAmount(debt.getRemainingAmount())
                .percentagePaid(debt.getPercentagePaid())
                .interestPaid(debt.getInterestPaid())
                .currencyCode(debt.getCurrencyCode())
                .interestRate(debt.getInterestRate())
                .interestType(debt.getInterestType())
                .paymentFrequency(debt.getPaymentFrequency())
                .paymentAmount(debt.getPaymentAmount())
                .nextPaymentDate(debt.getNextPaymentDate())
                .startDate(debt.getStartDate())
                .dueDate(debt.getDueDate())
                .monthsTotal(debt.getTotalMonths())
                .monthsPaid(debt.getMonthsPaid())
                .monthsRemaining(debt.getMonthsRemaining())
                .status(debt.getStatus())
                .account(accountInfo)
                .category(categoryInfo)
                .reminderEnabled(debt.getReminderEnabled())
                .reminderDaysBefore(debt.getReminderDaysBefore())
                .description(debt.getDescription())
                .note(debt.getNote())
                .attachmentUrl(debt.getAttachmentUrl())
                .paymentHistory(paymentHistory)
                .version(debt.getVersion())
                .createdAt(debt.getCreatedAt())
                .updatedAt(debt.getUpdatedAt())
                .build();
    }
}
