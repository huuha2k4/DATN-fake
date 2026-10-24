package com.finance.finance.modules.budget.service;

import com.finance.finance.common.enums.AlertLevel;
import com.finance.finance.common.enums.BudgetPeriodType;
import com.finance.finance.common.enums.BudgetStatus;
import com.finance.finance.modules.budget.dto.request.*;
import com.finance.finance.modules.budget.dto.response.*;
import com.finance.finance.modules.budget.entity.Budget;
import com.finance.finance.modules.budget.entity.BudgetItem;
import com.finance.finance.modules.budget.exception.BudgetNotFoundException;
import com.finance.finance.modules.budget.exception.DuplicateCategoryInBudgetException;
import com.finance.finance.modules.budget.exception.OverlappingBudgetException;
import com.finance.finance.modules.budget.repository.BudgetItemRepository;
import com.finance.finance.modules.budget.repository.BudgetRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
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
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final BudgetItemRepository budgetItemRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Tạo budget mới
     */
    @Transactional
    public BudgetResponse createBudget(UUID userId, CreateBudgetRequest request) {
        log.info("Creating budget for user: {}, name: {}", userId, request.getName());

        // Validate dates
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        // Check overlapping budgets
        if (budgetRepository.existsOverlappingBudget(userId, request.getPeriodType(), 
                request.getStartDate(), request.getEndDate(), null)) {
            throw new OverlappingBudgetException("Đã tồn tại ngân sách cho khoảng thời gian này");
        }

        // Validate total amount matches sum of items
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            BigDecimal itemsSum = request.getItems().stream()
                    .map(CreateBudgetRequest.BudgetItemRequest::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            if (itemsSum.compareTo(request.getTotalAmount()) != 0) {
                throw new IllegalArgumentException(
                        "Tổng số tiền của các danh mục phải bằng tổng ngân sách");
            }
        }

        // Create budget
        Budget budget = Budget.builder()
                .userId(userId)
                .name(request.getName())
                .periodType(request.getPeriodType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalAmount(request.getTotalAmount())
                .currencyCode(request.getCurrencyCode())
                .rolloverEnabled(request.getRolloverEnabled())
                .alertThresholdPercentage(request.getAlertThresholdPercentage())
                .spentAmount(BigDecimal.ZERO)
                .status(BudgetStatus.ON_TRACK)
                .build();

        budget = budgetRepository.save(budget);

        // Create budget items
        if (request.getItems() != null) {
            for (CreateBudgetRequest.BudgetItemRequest itemRequest : request.getItems()) {
                // Validate category exists
                categoryRepository.findByIdAndUserIdOrSystem(itemRequest.getCategoryId(), userId)
                        .orElseThrow(() -> new IllegalArgumentException("Danh mục không tồn tại"));

                BudgetItem item = BudgetItem.builder()
                        .budget(budget)
                        .categoryId(itemRequest.getCategoryId())
                        .amount(itemRequest.getAmount())
                        .alertThresholdPercentage(itemRequest.getAlertThresholdPercentage())
                        .spentAmount(BigDecimal.ZERO)
                        .alertLevel(AlertLevel.OK)
                        .transactionCount(0)
                        .build();
                
                budget.addItem(item);
            }
            budgetRepository.save(budget);
        }

        recalculateBudget(budget);

        log.info("Budget created successfully: {}", budget.getId());
        return mapToResponse(budget, false);
    }

    /**
     * Thêm hạn mức danh mục cho tháng đã chọn (Tự động tạo hoặc lấy Budget tháng đó và thêm item)
     */
    @Transactional
    public BudgetResponse.BudgetItemResponse addCategoryBudgetForMonth(
            UUID userId,
            Integer year,
            Integer month,
            BudgetItemRequest request) {
        log.info("Adding category budget for month {}/{} user: {}", month, year, userId);

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);

        List<Budget> existingBudgets = budgetRepository.findBudgetForMonth(userId, year, month);
        Budget targetBudget;

        if (!existingBudgets.isEmpty()) {
            targetBudget = existingBudgets.get(0);
        } else {
            // Tự động tạo ngân sách khung cho tháng
            String budgetName = String.format("Ngân sách Tháng %02d/%d", month, year);
            targetBudget = Budget.builder()
                    .userId(userId)
                    .name(budgetName)
                    .periodType(BudgetPeriodType.MONTHLY)
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalAmount(BigDecimal.ZERO)
                    .currencyCode("VND")
                    .rolloverEnabled(false)
                    .alertThresholdPercentage(80)
                    .spentAmount(BigDecimal.ZERO)
                    .status(BudgetStatus.ON_TRACK)
                    .build();
            targetBudget = budgetRepository.save(targetBudget);
        }

        return addBudgetItem(userId, targetBudget.getId(), request);
    }

    /**
     * Lấy danh sách budgets
     */
    @Transactional(readOnly = true)
    public BudgetListResponse getBudgets(UUID userId, BudgetStatus status, 
                                        BudgetPeriodType periodType, Integer year, Integer month) {
        log.info("Getting budgets for user: {}", userId);

        List<Budget> budgets;
        if (year != null) {
            budgets = budgetRepository.findByPeriod(userId, periodType, year, month);
        } else {
            budgets = budgetRepository.findByUserIdWithFilters(userId, status, periodType);
        }

        List<BudgetListResponse.BudgetSummaryItem> summaryItems = budgets.stream()
                .map(this::mapToSummaryItem)
                .collect(Collectors.toList());

        // Calculate summary
        BudgetListResponse.Summary summary = calculateListSummary(budgets);

        return BudgetListResponse.builder()
                .budgets(summaryItems)
                .summary(summary)
                .build();
    }

    /**
     * Lấy chi tiết budget
     */
    @Transactional(readOnly = true)
    public BudgetResponse getBudgetById(UUID userId, UUID budgetId) {
        log.info("Getting budget detail: {}", budgetId);

        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        return mapToResponse(budget, true);
    }

    /**
     * Cập nhật budget
     */
    @Transactional
    public BudgetResponse updateBudget(UUID userId, UUID budgetId, UpdateBudgetRequest request) {
        log.info("Updating budget: {}", budgetId);

        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        // Check version
        if (!budget.getVersion().equals(request.getVersion())) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        // Update fields
        if (request.getName() != null) {
            budget.setName(request.getName());
        }
        if (request.getTotalAmount() != null) {
            budget.setTotalAmount(request.getTotalAmount());
        }
        if (request.getAlertThresholdPercentage() != null) {
            budget.setAlertThresholdPercentage(request.getAlertThresholdPercentage());
        }
        if (request.getRolloverEnabled() != null) {
            budget.setRolloverEnabled(request.getRolloverEnabled());
        }

        budget = budgetRepository.save(budget);
        recalculateBudget(budget);

        log.info("Budget updated successfully: {}", budgetId);
        return mapToResponse(budget, false);
    }

    /**
     * Xóa budget
     */
    @Transactional
    public void deleteBudget(UUID userId, UUID budgetId, Integer version) {
        log.info("Deleting budget: {}", budgetId);

        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        if (!budget.getVersion().equals(version)) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        budget.softDelete();
        budgetRepository.save(budget);
        log.info("Budget deleted successfully: {}", budgetId);
    }

    /**
     * Lấy trạng thái chi tiêu hiện tại
     */
    @Transactional(readOnly = true)
    public BudgetStatusResponse getBudgetStatus(UUID userId, UUID budgetId) {
        log.info("Getting budget status: {}", budgetId);

        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        // Calculate projections
        long totalDays = ChronoUnit.DAYS.between(budget.getStartDate(), budget.getEndDate()) + 1;
        long elapsedDays = ChronoUnit.DAYS.between(budget.getStartDate(), LocalDate.now()) + 1;
        long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), budget.getEndDate());

        BigDecimal dailyBudget = budget.getTotalAmount()
                .divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP);
        BigDecimal dailyBudgetRemaining = remainingDays > 0 ?
                budget.getRemainingAmount().divide(BigDecimal.valueOf(remainingDays), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        BigDecimal projectedSpending = budget.getSpentAmount()
                .divide(BigDecimal.valueOf(elapsedDays), 2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(totalDays));

        BigDecimal projectedOverspend = projectedSpending.compareTo(budget.getTotalAmount()) > 0 ?
                projectedSpending.subtract(budget.getTotalAmount()) : BigDecimal.ZERO;

        // Get categories at risk
        List<BudgetItem> itemsAtRisk = budgetItemRepository.findItemsAtRisk(budgetId);
        List<BudgetStatusResponse.CategoryAtRisk> categoriesAtRisk = itemsAtRisk.stream()
                .map(item -> BudgetStatusResponse.CategoryAtRisk.builder()
                        .categoryId(item.getCategoryId())
                        .categoryName(getCategoryName(item.getCategoryId())) // TODO: Get from category service
                        .percentageUsed(item.getPercentageUsed())
                        .alertLevel(item.getAlertLevel())
                        .build())
                .collect(Collectors.toList());

        // Generate recommendations
        List<String> recommendations = generateRecommendations(budget, dailyBudgetRemaining, 
                projectedOverspend, remainingDays);

        return BudgetStatusResponse.builder()
                .budgetId(budgetId)
                .status(budget.getStatus())
                .alertLevel(calculateAlertLevel(budget))
                .totalAmount(budget.getTotalAmount())
                .spentAmount(budget.getSpentAmount())
                .remaining(budget.getRemainingAmount())
                .percentageUsed(budget.getPercentageUsed())
                .daysRemaining((int) remainingDays)
                .dailyBudgetRemaining(dailyBudgetRemaining)
                .projectedSpending(projectedSpending)
                .projectedOverspend(projectedOverspend)
                .categoriesAtRisk(categoriesAtRisk)
                .recommendations(recommendations)
                .build();
    }

    /**
     * Thêm budget item
     */
    @Transactional
    public BudgetResponse.BudgetItemResponse addBudgetItem(UUID userId, UUID budgetId, 
                                                          BudgetItemRequest request) {
        log.info("Adding budget item to budget: {}", budgetId);

        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        // Check if category already exists in budget
        if (budgetItemRepository.existsByBudgetIdAndCategoryId(budgetId, request.getCategoryId(), null)) {
            throw new DuplicateCategoryInBudgetException("Danh mục đã tồn tại trong ngân sách");
        }

        // Validate category exists
        categoryRepository.findByIdAndUserIdOrSystem(request.getCategoryId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Danh mục không tồn tại"));

        BudgetItem item = BudgetItem.builder()
                .budget(budget)
                .categoryId(request.getCategoryId())
                .name(request.getName())
                .amount(request.getAmount())
                .alertThresholdPercentage(request.getAlertThresholdPercentage())
                .spentAmount(BigDecimal.ZERO)
                .alertLevel(AlertLevel.OK)
                .transactionCount(0)
                .build();

        item = budgetItemRepository.save(item);

        // Update budget total amount
        budget.setTotalAmount(budget.getTotalAmount().add(request.getAmount()));
        budget.addItem(item);
        recalculateBudgetItem(item, budget);
        item = budgetItemRepository.save(item);

        log.info("Budget item added successfully: {}", item.getId());

        return mapItemToResponse(item);
    }

    /**
     * Cập nhật budget item
     */
    @Transactional
    public BudgetResponse.BudgetItemResponse updateBudgetItem(UUID userId, UUID budgetId, 
                                                             UUID itemId, UpdateBudgetItemRequest request) {
        log.info("Updating budget item: {}", itemId);

        BudgetItem item = budgetItemRepository.findByIdAndBudgetId(itemId, budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy budget item"));

        // Verify budget ownership
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        // Check version if provided
        if (request.getVersion() != null && !item.getVersion().equals(request.getVersion())) {
            throw new IllegalStateException("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.");
        }

        if (request.getName() != null) {
            item.setName(request.getName().trim());
        }

        if (request.getAmount() != null) {
            BigDecimal diff = request.getAmount().subtract(item.getAmount());
            item.setAmount(request.getAmount());
            budget.setTotalAmount(budget.getTotalAmount().add(diff).max(BigDecimal.ZERO));
        }
        if (request.getAlertThresholdPercentage() != null) {
            item.setAlertThresholdPercentage(request.getAlertThresholdPercentage());
        }

        recalculateBudgetItem(item, budget);

        log.info("Budget item updated successfully: {}", itemId);
        return mapItemToResponse(item);
    }

    /**
     * Xóa budget item
     */
    @Transactional
    public void deleteBudgetItem(UUID userId, UUID budgetId, UUID itemId) {
        log.info("Deleting budget item: {}", itemId);

        // Verify budget ownership
        Budget budget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        BudgetItem item = budgetItemRepository.findByIdAndBudgetId(itemId, budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy budget item"));

        budget.setTotalAmount(budget.getTotalAmount().subtract(item.getAmount()).max(BigDecimal.ZERO));
        budget.removeItem(item);
        budgetItemRepository.delete(item);

        recalculateBudget(budget);
        budgetRepository.save(budget);

        log.info("Budget item deleted successfully: {}", itemId);
    }

    /**
     * Lấy tổng quan tất cả budgets
     */
    @Transactional(readOnly = true)
    public BudgetSummaryResponse getBudgetsSummary(UUID userId, String period) {
        log.info("Getting budgets summary for user: {}", userId);

        // Get current period budget
        Budget currentBudget = budgetRepository.findCurrentMonthBudget(userId, LocalDate.now())
                .orElse(null);

        BudgetSummaryResponse.CurrentPeriod currentPeriod = null;
        if (currentBudget != null) {
            long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), currentBudget.getEndDate());
            
            currentPeriod = BudgetSummaryResponse.CurrentPeriod.builder()
                    .name(currentBudget.getName())
                    .startDate(currentBudget.getStartDate())
                    .endDate(currentBudget.getEndDate())
                    .totalBudgeted(currentBudget.getTotalAmount())
                    .totalSpent(currentBudget.getSpentAmount())
                    .totalRemaining(currentBudget.getRemainingAmount())
                    .percentageUsed(currentBudget.getPercentageUsed())
                    .status(currentBudget.getStatus())
                    .daysRemaining((int) daysRemaining)
                    .build();
        }

        // Get by category (from current budget)
        List<BudgetSummaryResponse.ByCategory> byCategory = new ArrayList<>();
        if (currentBudget != null) {
            byCategory = currentBudget.getItems().stream()
                    .map(item -> BudgetSummaryResponse.ByCategory.builder()
                            .category(getCategoryName(item.getCategoryId()))
                            .budgeted(item.getAmount())
                            .spent(item.getSpentAmount())
                            .percentage(item.getPercentageUsed())
                            .status(item.getPercentageUsed() > 100 ? BudgetStatus.EXCEEDED : BudgetStatus.ON_TRACK)
                            .build())
                    .collect(Collectors.toList());
        }

        // Calculate performance (last 6 months)
        LocalDate fromDate = LocalDate.now().minusMonths(6);
        LocalDate toDate = LocalDate.now();
        Object[] perfData = budgetRepository.getPerformanceStatistics(userId, fromDate, toDate);
        
        BudgetSummaryResponse.Performance performance = BudgetSummaryResponse.Performance.builder()
                .monthsOnTrack(perfData != null ? ((Number) perfData[1]).intValue() : 0)
                .monthsExceeded(perfData != null ? ((Number) perfData[2]).intValue() : 0)
                .successRate(perfData != null && ((Number) perfData[0]).intValue() > 0 ?
                        ((Number) perfData[1]).doubleValue() / ((Number) perfData[0]).doubleValue() * 100 : 0.0)
                .averageUtilization(perfData != null ? ((Number) perfData[3]).doubleValue() : 0.0)
                .build();

        // Get spending trends
        BudgetSummaryResponse.Trends trends = calculateTrends(userId);

        return BudgetSummaryResponse.builder()
                .currentPeriod(currentPeriod)
                .byCategory(byCategory)
                .performance(performance)
                .trends(trends)
                .build();
    }

    /**
     * Duplicate budget sang kỳ khác
     */
    @Transactional
    public BudgetResponse duplicateBudget(UUID userId, UUID budgetId, DuplicateBudgetRequest request) {
        log.info("Duplicating budget: {}", budgetId);

        Budget sourceBudget = budgetRepository.findByIdAndUserId(budgetId, userId)
                .orElseThrow(() -> new BudgetNotFoundException("Không tìm thấy ngân sách"));

        // Check overlapping
        if (budgetRepository.existsOverlappingBudget(userId, sourceBudget.getPeriodType(),
                request.getStartDate(), request.getEndDate(), null)) {
            throw new OverlappingBudgetException("Đã tồn tại ngân sách cho khoảng thời gian này");
        }

        // Calculate adjusted amounts
        BigDecimal adjustmentMultiplier = BigDecimal.ONE;
        if (request.getAdjustAmounts() != null && request.getAdjustAmounts().getPercentage() != null) {
            adjustmentMultiplier = BigDecimal.ONE.add(
                    BigDecimal.valueOf(request.getAdjustAmounts().getPercentage())
                            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        }

        BigDecimal newTotalAmount = sourceBudget.getTotalAmount().multiply(adjustmentMultiplier)
                .setScale(2, RoundingMode.HALF_UP);

        // Create new budget
        Budget newBudget = Budget.builder()
                .userId(userId)
                .name(request.getName())
                .periodType(sourceBudget.getPeriodType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalAmount(newTotalAmount)
                .currencyCode(sourceBudget.getCurrencyCode())
                .rolloverEnabled(sourceBudget.getRolloverEnabled())
                .alertThresholdPercentage(sourceBudget.getAlertThresholdPercentage())
                .spentAmount(BigDecimal.ZERO)
                .status(BudgetStatus.ON_TRACK)
                .build();

        newBudget = budgetRepository.save(newBudget);

        // Copy budget items
        for (BudgetItem sourceItem : sourceBudget.getItems()) {
            BigDecimal newAmount = sourceItem.getAmount().multiply(adjustmentMultiplier)
                    .setScale(2, RoundingMode.HALF_UP);

            BudgetItem newItem = BudgetItem.builder()
                    .budget(newBudget)
                    .categoryId(sourceItem.getCategoryId())
                    .amount(newAmount)
                    .alertThresholdPercentage(sourceItem.getAlertThresholdPercentage())
                    .spentAmount(BigDecimal.ZERO)
                    .alertLevel(AlertLevel.OK)
                    .transactionCount(0)
                    .build();

            newBudget.addItem(newItem);
        }

        newBudget = budgetRepository.save(newBudget);
        log.info("Budget duplicated successfully: {}", newBudget.getId());

        return mapToResponse(newBudget, false);
    }

    // ===== Private helper methods =====

    private void recalculateBudgetIfNeeded(Budget budget) {
        // Recalculate directly to guarantee real-time balance with user transactions
        recalculateBudget(budget);
    }

    private void recalculateBudget(Budget budget) {
        // Recalculate each item from actual transactions first
        BigDecimal totalSpent = BigDecimal.ZERO;
        for (BudgetItem item : budget.getItems()) {
            recalculateBudgetItem(item, budget);
            if (item.getSpentAmount() != null) {
                totalSpent = totalSpent.add(item.getSpentAmount());
            }
        }

        budget.setSpentAmount(totalSpent);
        // Update budget status
        budget.calculateAndUpdateStatus();
    }

    private void recalculateBudgetItem(BudgetItem item, Budget budget) {
        BigDecimal actualSpent = transactionRepository.sumSpentByUserIdAndCategoryAndDateRange(
                budget.getUserId(),
                item.getCategoryId(),
                budget.getStartDate(),
                budget.getEndDate()
        );
        long txCount = transactionRepository.countTransactionsByUserIdAndCategoryAndDateRange(
                budget.getUserId(),
                item.getCategoryId(),
                budget.getStartDate(),
                budget.getEndDate()
        );
        item.setSpentAmount(actualSpent != null ? actualSpent : BigDecimal.ZERO);
        item.setTransactionCount((int) txCount);
        item.calculateAndUpdateStatus();
    }

    private AlertLevel calculateAlertLevel(Budget budget) {
        if (budget.getPercentageUsed() == null) return AlertLevel.OK;
        if (budget.getPercentageUsed() > 100) return AlertLevel.CRITICAL;
        if (budget.getPercentageUsed() >= budget.getAlertThresholdPercentage()) return AlertLevel.WARNING;
        return AlertLevel.OK;
    }

    private List<String> generateRecommendations(Budget budget, BigDecimal dailyBudgetRemaining,
                                                 BigDecimal projectedOverspend, long remainingDays) {
        List<String> recommendations = new ArrayList<>();

        if (projectedOverspend.compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add(String.format("Dự kiến vượt ngân sách %.0f đồng. " +
                    "Hãy giảm chi tiêu để không vượt quá.", projectedOverspend.doubleValue()));
        }

        if (remainingDays > 0) {
            recommendations.add(String.format("Còn %d ngày, nên chi tối đa %.0f đồng/ngày",
                    remainingDays, dailyBudgetRemaining.doubleValue()));
        }

        return recommendations;
    }

    private BudgetSummaryResponse.Trends calculateTrends(UUID userId) {
        // TODO: Implement actual trend calculation
        return BudgetSummaryResponse.Trends.builder()
                .vsLastMonth(BudgetSummaryResponse.TrendComparison.builder()
                        .spendingChange(0.0)
                        .direction("STABLE")
                        .build())
                .vsAvg3Months(BudgetSummaryResponse.TrendComparison.builder()
                        .spendingChange(0.0)
                        .direction("STABLE")
                        .build())
                .build();
    }

    private BudgetListResponse.Summary calculateListSummary(List<Budget> budgets) {
        int total = budgets.size();
        int active = (int) budgets.stream().filter(Budget::isActive).count();
        int onTrack = (int) budgets.stream().filter(b -> b.getStatus() == BudgetStatus.ON_TRACK).count();
        int warning = (int) budgets.stream().filter(b -> b.getStatus() == BudgetStatus.WARNING).count();
        int exceeded = (int) budgets.stream().filter(b -> b.getStatus() == BudgetStatus.EXCEEDED).count();

        return BudgetListResponse.Summary.builder()
                .totalBudgets(total)
                .activeBudgets(active)
                .onTrack(onTrack)
                .warning(warning)
                .exceeded(exceeded)
                .build();
    }

    private BudgetListResponse.BudgetSummaryItem mapToSummaryItem(Budget budget) {
        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), budget.getEndDate());

        return BudgetListResponse.BudgetSummaryItem.builder()
                .id(budget.getId())
                .name(budget.getName())
                .periodType(budget.getPeriodType())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .totalAmount(budget.getTotalAmount())
                .spentAmount(budget.getSpentAmount())
                .remaining(budget.getRemainingAmount())
                .percentageUsed(budget.getPercentageUsed())
                .status(budget.getStatus())
                .alertLevel(calculateAlertLevel(budget))
                .daysRemaining((int) daysRemaining)
                .itemsCount(budget.getItems().size())
                .categoriesExceeded(budgetItemRepository.countCategoriesExceeded(budget.getId()).intValue())
                .build();
    }

    private BudgetResponse mapToResponse(Budget budget, boolean includeDetails) {
        long totalDays = ChronoUnit.DAYS.between(budget.getStartDate(), budget.getEndDate()) + 1;
        long elapsedDays = ChronoUnit.DAYS.between(budget.getStartDate(), LocalDate.now()) + 1;
        long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), budget.getEndDate());

        List<BudgetResponse.BudgetItemResponse> items = budget.getItems().stream()
                .map(this::mapItemToResponse)
                .collect(Collectors.toList());

        BigDecimal calculatedSpent = items.stream()
                .map(i -> i.getSpentAmount() != null ? i.getSpentAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingAmount = budget.getTotalAmount().subtract(calculatedSpent);
        Double percentageUsed = (budget.getTotalAmount() != null && budget.getTotalAmount().compareTo(BigDecimal.ZERO) > 0)
                ? calculatedSpent.divide(budget.getTotalAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;

        BudgetStatus currentStatus = BudgetStatus.ON_TRACK;
        if (percentageUsed > 100) {
            currentStatus = BudgetStatus.EXCEEDED;
        } else if (percentageUsed >= budget.getAlertThresholdPercentage()) {
            currentStatus = BudgetStatus.WARNING;
        }

        BigDecimal dailyBudgetRemaining = remainingDays > 0 ?
                remainingAmount.divide(BigDecimal.valueOf(remainingDays), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        BigDecimal projectedSpending = elapsedDays > 0 && elapsedDays <= totalDays ?
                calculatedSpent.divide(BigDecimal.valueOf(elapsedDays), 2, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(totalDays)) :
                calculatedSpent;

        return BudgetResponse.builder()
                .id(budget.getId())
                .name(budget.getName())
                .periodType(budget.getPeriodType())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .totalAmount(budget.getTotalAmount())
                .spentAmount(calculatedSpent)
                .remaining(remainingAmount)
                .percentageUsed(percentageUsed)
                .currencyCode(budget.getCurrencyCode())
                .status(currentStatus)
                .alertLevel(calculateAlertLevel(budget))
                .rolloverEnabled(budget.getRolloverEnabled())
                .alertThresholdPercentage(budget.getAlertThresholdPercentage())
                .daysTotal((int) totalDays)
                .daysElapsed((int) elapsedDays)
                .daysRemaining((int) remainingDays)
                .dailyBudgetRemaining(dailyBudgetRemaining)
                .projectedSpending(projectedSpending)
                .items(items)
                .itemsCount(items.size())
                .categoriesExceeded(budgetItemRepository.countCategoriesExceeded(budget.getId()).intValue())
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .version(budget.getVersion())
                .build();
    }

    private BudgetResponse.BudgetItemResponse mapItemToResponse(BudgetItem item) {
        long totalDays = ChronoUnit.DAYS.between(item.getBudget().getStartDate(), 
                item.getBudget().getEndDate()) + 1;
        long elapsedDays = ChronoUnit.DAYS.between(item.getBudget().getStartDate(), LocalDate.now()) + 1;

        BigDecimal actualSpent = transactionRepository.sumSpentByUserIdAndCategoryAndDateRange(
                item.getBudget().getUserId(),
                item.getCategoryId(),
                item.getBudget().getStartDate(),
                item.getBudget().getEndDate()
        );
        BigDecimal itemSpent = actualSpent != null ? actualSpent : BigDecimal.ZERO;
        long txCount = transactionRepository.countTransactionsByUserIdAndCategoryAndDateRange(
                item.getBudget().getUserId(),
                item.getCategoryId(),
                item.getBudget().getStartDate(),
                item.getBudget().getEndDate()
        );

        BigDecimal itemRemaining = item.getAmount() != null ? item.getAmount().subtract(itemSpent) : BigDecimal.ZERO;
        Double itemPercentage = (item.getAmount() != null && item.getAmount().compareTo(BigDecimal.ZERO) > 0)
                ? itemSpent.divide(item.getAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0.0;

        AlertLevel alertLevel = AlertLevel.OK;
        if (itemPercentage > 100) {
            alertLevel = AlertLevel.CRITICAL;
        } else if (itemPercentage >= item.getAlertThresholdPercentage()) {
            alertLevel = AlertLevel.WARNING;
        }

        BigDecimal dailyAverage = elapsedDays > 0 ?
                itemSpent.divide(BigDecimal.valueOf(elapsedDays), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        BigDecimal projectedTotal = dailyAverage.multiply(BigDecimal.valueOf(totalDays));
        Boolean onTrack = item.getAmount() != null && projectedTotal.compareTo(item.getAmount()) <= 0;

        com.finance.finance.modules.category.entity.Category cat = categoryRepository
                .findById(item.getCategoryId()).orElse(null);

        String catName = cat != null ? cat.getName() : "Danh mục";
        String catIcon = cat != null && cat.getIcon() != null ? cat.getIcon() : "wallet";
        String catColor = cat != null && cat.getColor() != null ? cat.getColor() : "#07543f";

        return BudgetResponse.BudgetItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .category(BudgetResponse.CategoryInfo.builder()
                        .id(item.getCategoryId())
                        .name(catName)
                        .icon(catIcon)
                        .color(catColor)
                        .build())
                .amount(item.getAmount())
                .spentAmount(itemSpent)
                .remaining(itemRemaining)
                .percentageUsed(itemPercentage)
                .alertLevel(alertLevel)
                .alertThresholdPercentage(item.getAlertThresholdPercentage())
                .dailyAverage(dailyAverage)
                .projectedTotal(projectedTotal)
                .onTrack(onTrack)
                .transactionCount((int) txCount)
                .build();
    }

    private String getCategoryName(UUID categoryId) {
        return categoryRepository.findById(categoryId)
                .map(com.finance.finance.modules.category.entity.Category::getName)
                .orElse("Danh mục");
    }
}
