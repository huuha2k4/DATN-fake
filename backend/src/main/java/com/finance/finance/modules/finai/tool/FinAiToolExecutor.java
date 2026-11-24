package com.finance.finance.modules.finai.tool;

import com.finance.finance.common.enums.*;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.account.dto.response.AccountListResponse;
import com.finance.finance.modules.account.dto.response.AccountResponse;
import com.finance.finance.modules.account.dto.response.AccountSummaryResponse;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.dto.request.CreateAccountRequest;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.account.service.AccountService;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.repository.ChildSpendRequestRepository;
import com.finance.finance.modules.group.entity.ChildWallet;
import com.finance.finance.modules.group.entity.ChildSpendRequest;
import com.finance.finance.modules.budget.dto.request.CreateBudgetRequest;
import com.finance.finance.modules.budget.dto.request.UpdateBudgetRequest;
import com.finance.finance.modules.budget.dto.response.BudgetResponse;
import com.finance.finance.modules.budget.repository.BudgetRepository;
import com.finance.finance.modules.budget.service.BudgetService;
import com.finance.finance.modules.debt.service.DebtService;
import com.finance.finance.modules.debt.dto.response.DebtListResponse;
import com.finance.finance.modules.debt.dto.response.DebtDetailResponse;
import com.finance.finance.modules.debt.dto.request.CreateDebtRequest;
import com.finance.finance.modules.debt.dto.request.RecordPaymentRequest;
import com.finance.finance.modules.goal.service.GoalService;
import com.finance.finance.modules.goal.dto.request.CreateGoalRequest;
import com.finance.finance.modules.goal.dto.request.ContributeRequest;
import com.finance.finance.modules.goal.dto.response.GoalResponse;
import com.finance.finance.modules.group.service.*;
import com.finance.finance.modules.group.dto.request.CreateExpenseRequest;
import com.finance.finance.modules.group.dto.request.ContributeGroupFundRequest;
import com.finance.finance.modules.group.dto.request.CreateSpendRequestRequest;
import com.finance.finance.modules.group.dto.request.DepositWalletRequest;
import com.finance.finance.modules.group.dto.response.MemberResponse;
import com.finance.finance.modules.schedule.service.ScheduleService;
import com.finance.finance.modules.schedule.service.RecurrenceService;
import com.finance.finance.modules.schedule.dto.TransactionTemplate;
import com.finance.finance.modules.schedule.dto.request.CreateScheduleRequest;
import com.finance.finance.modules.schedule.dto.request.UpdateScheduleRequest;
import com.finance.finance.modules.schedule.dto.response.ScheduleDetailResponse;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.transaction.dto.request.*;
import com.finance.finance.modules.transaction.service.TransactionService;
import jakarta.validation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FinAiToolExecutor {
    private final FinAiToolRegistry registry;
    private final TransactionService transactionService;
    private final AccountService accountService;
    private final BudgetService budgetService;
    private final GoalService goalService;
    private final DebtService debtService;
    private final ScheduleService scheduleService;
    private final RecurrenceService recurrenceService;
    private final GroupService groupService;
    private final GroupExpenseService groupExpenseService;
    private final GroupFundService groupFundService;
    private final GroupSettlementService groupSettlementService;
    private final ChildWalletService childWalletService;
    private final ChildManagementService childManagementService;
    private final ChildWalletRepository childWalletRepository;
    private final ChildSpendRequestRepository childSpendRequestRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final Validator validator;

    public record PreparedAction(String title, String description, Map<String, Object> preview) {}

    public Object executeRead(UUID userId, String toolName, Map<String, Object> args) {
        registry.validate(toolName, args, FinAiToolMode.READ);
        Object data = switch (toolName) {
            case "get_transactions" -> readTransactions(userId, args);
            case "get_accounts" -> readAccounts(userId, args);
            case "get_financial_overview" -> readOverview(userId, args);
            case "get_budgets" -> bool(args, "summaryOnly", false)
                    ? budgetService.getBudgetsSummary(userId, "current")
                    : budgetService.getBudgets(userId, enumValue(args, "status", BudgetStatus.class, null),
                        enumValue(args, "periodType", BudgetPeriodType.class, null),
                        nullableInteger(args, "year", 2000, 2100), nullableInteger(args, "month", 1, 12));
            case "get_goals" -> bool(args, "summaryOnly", false)
                    ? goalService.getGoalsSummary(userId)
                    : goalService.getGoals(userId, enumValue(args, "status", GoalStatus.class, null));
            case "get_debts" -> readDebts(userId, args);
            case "get_schedules" -> readSchedules(userId, args);
            case "get_groups" -> groupService.getGroups(page(args, "createdAt"), userId);
            case "get_group_finances" -> readGroupFinances(userId, args);
            default -> throw notAllowed();
        };
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("status", "SUCCESS");
        envelope.put("tool", toolName);
        envelope.put("data", data);
        return envelope;
    }

    private Object readTransactions(UUID userId, Map<String, Object> args) {
        TransactionFilter filter = TransactionFilter.builder()
                .fromDate(date(args, "fromDate", null)).toDate(date(args, "toDate", null))
                .accountId(uuid(args, "accountId", false)).categoryId(uuid(args, "categoryId", false))
                .transactionType(enumValue(args, "transactionType", TransactionType.class, null))
                .minAmount(decimal(args, "minAmount", null)).maxAmount(decimal(args, "maxAmount", null))
                .search(string(args, "search", null, 200))
                .page(integer(args, "page", 1, 1, 100000))
                .pageSize(integer(args, "pageSize", 20, 1, 50)).build();
        if (filter.getFromDate() != null && filter.getToDate() != null && filter.getToDate().isBefore(filter.getFromDate()))
            throw schema("toDate must not be before fromDate");
        log.info("FinAI READ get_transactions range={}..{}, type={}, page={}, pageSize={}",
                filter.getFromDate(), filter.getToDate(), filter.getTransactionType(), filter.getPage(), filter.getPageSize());
        Object transactions = transactionService.listTransactions(userId, filter);
        if (filter.getFromDate() != null && filter.getToDate() != null) {
            Object analysis = transactionService.getTransactionSummary(userId, filter.getFromDate(),
                    filter.getToDate(), "day", filter.getAccountId());
            return Map.of("transactions", transactions, "analysis", analysis);
        }

        // If the user is a child with no personal transactions, include approved child spend requests as transactions
        Optional<ChildWallet> childWalletOpt = childWalletRepository.findByUserId(userId);
        if (childWalletOpt.isPresent() && transactions instanceof Page<?> p && p.isEmpty()) {
            ChildWallet cw = childWalletOpt.get();
            Instant fromInst = filter.getFromDate() != null
                    ? filter.getFromDate().atStartOfDay(ZoneId.systemDefault()).toInstant()
                    : Instant.now().minus(30, java.time.temporal.ChronoUnit.DAYS);
            Instant toInst = filter.getToDate() != null
                    ? filter.getToDate().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant()
                    : Instant.now().plus(1, java.time.temporal.ChronoUnit.DAYS);

            List<ChildSpendRequest> spendList = childSpendRequestRepository.findByWalletIdAndDateRange(cw.getId(), fromInst, toInst);
            List<Map<String, Object>> syntheticList = new ArrayList<>();
            BigDecimal totalExpense = BigDecimal.ZERO;
            BigDecimal totalIncome = BigDecimal.ZERO;

            for (ChildSpendRequest req : spendList) {
                if (req.getStatus() != SpendRequestStatus.APPROVED) continue;
                boolean isIncome = req.getDescription() != null && (
                        req.getDescription().startsWith("[INCOME_DEPOSIT] ")
                        || req.getDescription().startsWith("[INCOME_GIFT] ")
                        || req.getDescription().startsWith("[INCOME_CHORE] ")
                        || req.getDescription().startsWith("[MONEY_REQUEST] ")
                );

                BigDecimal amt = req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO;
                if (isIncome) totalIncome = totalIncome.add(amt);
                else totalExpense = totalExpense.add(amt);

                String catName = "Chi tiêu";
                if (req.getCategoryId() != null) {
                    var cOpt = categoryRepository.findById(req.getCategoryId());
                    if (cOpt.isPresent()) catName = cOpt.get().getName();
                }

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", req.getId());
                item.put("type", isIncome ? "INCOME" : "EXPENSE");
                item.put("amount", amt);
                item.put("categoryName", catName);
                item.put("description", req.getDescription());
                item.put("occurredDate", req.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate().toString());
                syntheticList.add(item);
            }

            Map<String, Object> syntheticAnalysis = Map.of(
                    "summary", Map.of("totalExpense", totalExpense, "totalIncome", totalIncome, "netAmount", totalIncome.subtract(totalExpense))
            );
            return Map.of("transactions", syntheticList, "analysis", syntheticAnalysis, "content", syntheticList, "totalElements", syntheticList.size());
        }

        return transactions;
    }

    private Object readAccounts(UUID userId, Map<String, Object> args) {
        boolean summaryOnly = bool(args, "summaryOnly", false);
        Optional<ChildWallet> childWalletOpt = childWalletRepository.findByUserId(userId);

        if (summaryOnly) {
            AccountSummaryResponse summary = accountService.getAccountsSummary(userId, "VND");
            if (childWalletOpt.isPresent()) {
                ChildWallet cw = childWalletOpt.get();
                BigDecimal childBal = cw.getBalance() != null ? cw.getBalance() : BigDecimal.ZERO;
                BigDecimal currentTotal = summary.getSummary() != null && summary.getSummary().getTotalAssets() != null
                        ? summary.getSummary().getTotalAssets() : BigDecimal.ZERO;
                BigDecimal currentLiabilities = summary.getSummary() != null && summary.getSummary().getTotalLiabilities() != null
                        ? summary.getSummary().getTotalLiabilities() : BigDecimal.ZERO;
                BigDecimal newTotal = currentTotal.add(childBal);
                BigDecimal newNetWorth = newTotal.subtract(currentLiabilities);

                AccountSummaryResponse.Summary updatedSummary = AccountSummaryResponse.Summary.builder()
                        .totalAssets(newTotal)
                        .totalLiabilities(currentLiabilities)
                        .netWorth(newNetWorth)
                        .currencyCode("VND")
                        .build();

                List<AccountSummaryResponse.ByType> byType = new ArrayList<>(
                        summary.getByType() != null ? summary.getByType() : Collections.emptyList()
                );
                byType.add(AccountSummaryResponse.ByType.builder()
                        .accountType(AccountType.CASH)
                        .count(1)
                        .totalBalance(childBal)
                        .percentage(100.0)
                        .build());

                return AccountSummaryResponse.builder()
                        .summary(updatedSummary)
                        .byType(byType)
                        .byCurrency(summary.getByCurrency())
                        .netWorthTrend30Days(summary.getNetWorthTrend30Days())
                        .build();
            }
            return summary;
        }

        AccountListResponse list = accountService.getAccounts(userId, bool(args, "includeInactive", false),
                enumValue(args, "accountType", AccountType.class, null), "VND");

        if (childWalletOpt.isPresent()) {
            ChildWallet cw = childWalletOpt.get();
            BigDecimal childBal = cw.getBalance() != null ? cw.getBalance() : BigDecimal.ZERO;
            List<AccountResponse> accounts = new ArrayList<>(
                    list.getAccounts() != null ? list.getAccounts() : Collections.emptyList()
            );

            accounts.add(AccountResponse.builder()
                    .id(cw.getId())
                    .name("Ví bé " + cw.getChildName())
                    .accountType(AccountType.CASH)
                    .currencyCode(cw.getCurrency() != null ? cw.getCurrency() : "VND")
                    .balance(childBal)
                    .displayBalance(formatVndDisplay(childBal))
                    .build());

            BigDecimal currentTotal = list.getSummary() != null && list.getSummary().getTotalAssets() != null
                    ? list.getSummary().getTotalAssets() : BigDecimal.ZERO;
            BigDecimal currentLiabilities = list.getSummary() != null && list.getSummary().getTotalLiabilities() != null
                    ? list.getSummary().getTotalLiabilities() : BigDecimal.ZERO;
            BigDecimal newTotal = currentTotal.add(childBal);
            BigDecimal newNetWorth = newTotal.subtract(currentLiabilities);

            AccountListResponse.AccountSummary updatedSummary = AccountListResponse.AccountSummary.builder()
                    .totalAssets(newTotal)
                    .totalLiabilities(currentLiabilities)
                    .netWorth(newNetWorth)
                    .currencyCode("VND")
                    .build();

            return AccountListResponse.builder()
                    .accounts(accounts)
                    .summary(updatedSummary)
                    .build();
        }

        return list;
    }

    private String formatVndDisplay(BigDecimal amount) {
        if (amount == null) return "0 ₫";
        return String.format("%,d ₫", amount.longValue());
    }

    private Object readOverview(UUID userId, Map<String, Object> args) {
        LocalDate to = date(args, "toDate", LocalDate.now());
        LocalDate from = date(args, "fromDate", to.withDayOfMonth(1));
        if (to.isBefore(from)) throw schema("toDate must not be before fromDate");
        if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > 3660) throw schema("date range is too large");
        String groupBy = string(args, "groupBy", "day", 10);
        if (!Set.of("day", "week", "month", "year").contains(groupBy)) throw schema("groupBy is unsupported");
        UUID accountId = uuid(args, "accountId", false);
        Set<String> sections = stringSet(args, "sections", Set.of("cashflow"),
                Set.of("cashflow", "accounts", "budgets", "goals", "debts"), 5);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", Map.of("fromDate", from, "toDate", to));
        result.put("cashflow", transactionService.getTransactionSummary(userId, from, to, groupBy, accountId));
        LocalDate comparisonFrom = date(args, "comparisonFromDate", null);
        LocalDate comparisonTo = date(args, "comparisonToDate", null);
        if ((comparisonFrom == null) != (comparisonTo == null))
            throw schema("comparisonFromDate and comparisonToDate must be provided together");
        if (comparisonFrom != null) {
            if (comparisonTo.isBefore(comparisonFrom)) throw schema("comparisonToDate must not be before comparisonFromDate");
            if (java.time.temporal.ChronoUnit.DAYS.between(comparisonFrom, comparisonTo) > 3660)
                throw schema("comparison date range is too large");
            result.put("comparisonPeriod", Map.of("fromDate", comparisonFrom, "toDate", comparisonTo));
            result.put("comparisonCashflow", transactionService.getTransactionSummary(
                    userId, comparisonFrom, comparisonTo, groupBy, accountId));
        }
        if (sections.contains("accounts")) result.put("accounts", readAccounts(userId, Map.of("summaryOnly", true)));
        if (sections.contains("budgets")) result.put("budgets", budgetService.getBudgetsSummary(userId, "current"));
        if (sections.contains("goals")) result.put("goals", goalService.getGoalsSummary(userId));
        if (sections.contains("debts")) result.put("debts", debtService.getSummary(userId));
        return result;
    }

    private Object readGroupFinances(UUID userId, Map<String, Object> args) {
        UUID groupId = uuid(args, "groupId", true);
        String section = string(args, "section", null, 30);
        var pageable = page(args, "createdAt");
        return switch (section) {
            case "overview" -> {
                int year = integer(args, "year", LocalDate.now().getYear(), 2000, 2100);
                int month = integer(args, "month", LocalDate.now().getMonthValue(), 1, 12);
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("group", groupService.getGroupDetail(groupId, userId));
                result.put("balances", groupExpenseService.getBalances(groupId, userId));
                result.put("monthlyStatistics", groupFundService.getMonthlyStatistics(groupId, year, month, userId));
                yield result;
            }
            case "expenses" -> groupExpenseService.getExpenses(groupId, pageable, userId);
            case "members" -> groupService.getMembers(groupId, userId);
            case "balances" -> groupExpenseService.getBalances(groupId, userId);
            case "fund" -> Map.of("fund", groupFundService.getFund(groupId, userId),
                    "contributions", groupFundService.getContributions(groupId, userId));
            case "settlements" -> groupSettlementService.getSettlements(groupId,
                    string(args, "status", null, 30), pageable, userId);
            case "child_wallets" -> childWalletService.getWallets(groupId, pageable, userId);
            default -> throw schema("section is unsupported");
        };
    }

    private Object readSchedules(UUID userId, Map<String, Object> args) {
        LocalDate from = date(args, "fromDate", null);
        LocalDate to = date(args, "toDate", null);
        if ((from == null) != (to == null)) throw schema("fromDate and toDate must be provided together");
        if (from != null) {
            if (to.isBefore(from)) throw schema("toDate must not be before fromDate");
            if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > 366)
                throw schema("schedule date range is too large");
            return scheduleService.getUpcomingSchedules(userId, from, to, page(args, "nextOccurrenceDate"));
        }
        return scheduleService.getSchedules(userId, string(args, "status", null, 30),
                string(args, "scheduleType", null, 30), string(args, "search", null, 200), page(args, "createdAt"));
    }

    private Object readDebts(UUID userId, Map<String, Object> args) {
        LocalDate from = date(args, "fromDate", null);
        LocalDate to = date(args, "toDate", null);
        if ((from == null) != (to == null)) throw schema("fromDate and toDate must be provided together");
        if (from != null) {
            if (to.isBefore(from)) throw schema("toDate must not be before fromDate");
            if (java.time.temporal.ChronoUnit.DAYS.between(from, to) > 366)
                throw schema("debt calendar date range is too large");
        }
        if (bool(args, "summaryOnly", false) && from == null) return debtService.getSummary(userId);

        DebtListResponse response = debtService.getDebts(userId,
                enumValue(args, "debtType", DebtType.class, null),
                enumValue(args, "status", DebtStatus.class, null));
        if (from == null) return response;

        List<Map<String, Object>> occurrences = debtCalendarOccurrences(response.getDebts(), from, to);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", Map.of("fromDate", from, "toDate", to));
        result.put("debts", response.getDebts());
        result.put("summary", response.getSummary());
        result.put("calendarOccurrences", occurrences);
        result.put("calendarOccurrenceCount", occurrences.size());
        return result;
    }

    /** Mirrors the debt events rendered by the web/mobile financial calendar. */
    private List<Map<String, Object>> debtCalendarOccurrences(
            List<DebtListResponse.DebtSummaryItem> debts, LocalDate from, LocalDate to) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (DebtListResponse.DebtSummaryItem debt : debts) {
            PaymentFrequency frequency = debt.getPaymentFrequency() == null
                    ? PaymentFrequency.ONE_TIME : debt.getPaymentFrequency();
            boolean periodic = frequency != PaymentFrequency.ONE_TIME;
            BigDecimal amount = firstAmount(debt.getMonthlyPayment(), debt.getPaymentAmount(),
                    debt.getNextPaymentAmount(), debt.getRemaining(), debt.getPrincipalAmount());
            LocalDate firstDate = periodic
                    ? firstDate(debt.getNextPaymentDate(), debt.getStartDate(), debt.getDueDate())
                    : firstDate(debt.getDueDate(), debt.getNextPaymentDate(), debt.getStartDate());
            if (firstDate == null) continue;

            if (!periodic) {
                if (!firstDate.isBefore(from) && !firstDate.isAfter(to))
                    result.add(debtOccurrence(debt, firstDate, amount, 1));
                continue;
            }

            int maxPeriods = 60;
            BigDecimal basis = debt.getPrincipalAmount() != null ? debt.getPrincipalAmount() : debt.getRemaining();
            if (amount.signum() > 0 && basis != null) {
                maxPeriods = Math.max(1, basis.divide(amount, 0, java.math.RoundingMode.HALF_UP).intValue());
            }
            LocalDate occurrenceDate = firstDate;
            for (int index = 0; index < maxPeriods; index++) {
                if (debt.getDueDate() != null && occurrenceDate.isAfter(debt.getDueDate())) break;
                if (occurrenceDate.isAfter(to)) break;
                if (!occurrenceDate.isBefore(from))
                    result.add(debtOccurrence(debt, occurrenceDate, amount, index + 1));
                occurrenceDate = advance(occurrenceDate, frequency);
                if (debt.getDueDate() == null && index + 1 >= 12) break;
            }
        }
        result.sort(Comparator.comparing(item -> LocalDate.parse(String.valueOf(item.get("dueDate")))));
        return result;
    }

    private Map<String, Object> debtOccurrence(DebtListResponse.DebtSummaryItem debt,
                                                LocalDate dueDate, BigDecimal amount, int occurrenceNumber) {
        boolean collection = debt.getDebtType() == DebtType.LENDING;
        String partner = collection ? debt.getDebtorName() : debt.getCreditorName();
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("source", "DEBT");
        item.put("debtId", debt.getId());
        item.put("debtType", debt.getDebtType());
        item.put("title", (collection ? "Thu nợ" : "Trả nợ") + ": "
                + (partner == null || partner.isBlank() ? "Khoản nợ" : partner));
        item.put("dueDate", dueDate);
        item.put("amount", amount);
        item.put("direction", collection ? "INCOME" : "EXPENSE");
        item.put("status", debt.getStatus());
        item.put("occurrenceNumber", occurrenceNumber);
        return item;
    }

    private LocalDate advance(LocalDate date, PaymentFrequency frequency) {
        return switch (frequency) {
            case WEEKLY -> date.plusWeeks(1);
            case BIWEEKLY -> date.plusWeeks(2);
            case MONTHLY -> date.plusMonths(1);
            case QUARTERLY -> date.plusMonths(3);
            case YEARLY -> date.plusYears(1);
            case ONE_TIME -> date;
        };
    }

    private LocalDate firstDate(LocalDate... dates) {
        for (LocalDate value : dates) if (value != null) return value;
        return null;
    }

    private BigDecimal firstAmount(BigDecimal... amounts) {
        for (BigDecimal value : amounts) if (value != null && value.signum() > 0) return value;
        return BigDecimal.ZERO;
    }

    private PageRequest page(Map<String, Object> args, String sortField) {
        int number = integer(args, "page", 1, 1, 100000) - 1;
        int size = integer(args, "pageSize", 20, 1, 50);
        return PageRequest.of(number, size, Sort.by(Sort.Direction.DESC, sortField));
    }

    public PreparedAction prepareWrite(UUID userId, String toolName, Map<String, Object> args) {
        registry.validate(toolName, args, FinAiToolMode.WRITE);
        return switch (toolName) {
            case "create_transaction" -> prepareTransaction(userId, args);
            case "create_budget" -> prepareBudget(userId, args);
            case "create_goal" -> prepareGoal(userId, args);
            case "contribute_to_goal" -> prepareGoalContribution(userId, args);
            case "create_debt" -> prepareDebt(userId, args);
            case "record_debt_payment" -> prepareDebtPayment(userId, args);
            case "update_budget" -> prepareBudgetUpdate(userId, args);
            case "create_schedule" -> prepareSchedule(userId, args);
            case "update_schedule" -> prepareScheduleUpdate(userId, args);
            case "create_account" -> prepareAccount(args);
            case "create_group_transaction" -> prepareGroupExpense(userId, args);
            case "contribute_group_fund" -> prepareGroupFundContribution(userId, args);
            case "create_child_spend" -> prepareChildSpend(userId, args);
            case "deposit_child_wallet" -> prepareChildDeposit(userId, args);
            default -> throw notAllowed();
        };
    }

    public Object executeWrite(UUID userId, String toolName, Map<String, Object> args) {
        prepareWrite(userId, toolName, args); // full ownership and stale-condition revalidation
        return switch (toolName) {
            case "create_transaction" -> transactionService.createTransaction(userId, transactionRequest(userId, args));
            case "create_budget" -> budgetService.createBudget(userId, budgetRequest(userId, args));
            case "create_goal" -> goalService.createGoal(userId, goalRequest(userId, args));
            case "contribute_to_goal" -> goalService.contribute(userId, uuid(args, "goalId", true), contributionRequest(userId, args));
            case "create_debt" -> debtService.createDebt(userId, debtRequest(userId, args));
            case "record_debt_payment" -> debtService.recordPayment(userId, uuid(args, "debtId", true), debtPaymentRequest(userId, args));
            case "update_budget" -> budgetService.updateBudget(userId, uuid(args, "budgetId", true), budgetUpdateRequest(args));
            case "create_schedule" -> scheduleService.createSchedule(scheduleRequest(userId, args), userId);
            case "update_schedule" -> scheduleService.updateSchedule(longValue(args, "scheduleId", true), scheduleUpdateRequest(args), userId);
            case "create_account" -> accountService.createAccount(userId, accountRequest(args));
            case "create_group_transaction" -> groupExpenseService.createExpense(uuid(args, "groupId", true), groupExpenseRequest(userId, args), userId);
            case "contribute_group_fund" -> groupFundService.contribute(uuid(args, "groupId", true), groupFundContributionRequest(userId, args), userId);
            case "create_child_spend" -> {
                UUID gid = uuid(args, "groupId", false);
                UUID wid = uuid(args, "walletId", false);
                Optional<ChildWallet> cwOpt = childWalletRepository.findByUserId(userId);
                if (cwOpt.isPresent()) {
                    wid = cwOpt.get().getId();
                    gid = cwOpt.get().getGroupId();
                } else {
                    if (gid == null) gid = uuid(args, "groupId", true);
                    if (wid == null) wid = uuid(args, "walletId", true);
                }
                yield childManagementService.createDirectChildSpend(gid, wid, childSpendRequest(userId, args), userId);
            }
            case "deposit_child_wallet" -> childWalletService.deposit(uuid(args, "groupId", true), uuid(args, "walletId", true), childDepositRequest(userId, args), userId);
            default -> throw notAllowed();
        };
    }

    private PreparedAction prepareTransaction(UUID userId, Map<String, Object> args) {
        CreateTransactionRequest request = transactionRequest(userId, args);
        validateBean(request);
        Account source = accountRepository.findByIdAndUserId(request.getAccountId(), userId)
                .orElseThrow(() -> forbiddenResource("accountId"));
        Account destination = null;
        Category category = null;
        if (request.getTransactionType() == TransactionType.TRANSFER) {
            if (request.getToAccountId() == null || request.getToAccountId().equals(request.getAccountId()))
                throw schema("A distinct toAccountId is required for TRANSFER");
            destination = accountRepository.findByIdAndUserId(request.getToAccountId(), userId)
                    .orElseThrow(() -> forbiddenResource("toAccountId"));
            if (request.getCategoryId() != null) throw schema("categoryId must be absent for TRANSFER");
        } else {
            if (request.getCategoryId() == null) throw schema("categoryId is required for income/expense");
            category = categoryRepository.findByIdAndUserIdOrSystem(request.getCategoryId(), userId)
                    .orElseThrow(() -> forbiddenResource("categoryId"));
        }
        if (request.getTransactionDate().isAfter(LocalDate.now())) throw schema("transactionDate cannot be in the future");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("type", request.getTransactionType().name());
        preview.put("transactionType", request.getTransactionType().name());
        preview.put("amount", request.getAmount());
        preview.put("currency", request.getCurrencyCode());
        preview.put("currencyCode", request.getCurrencyCode());
        preview.put("accountId", request.getAccountId().toString());
        preview.put("account", source.getName());
        preview.put("accountName", source.getName());
        if (destination != null) {
            preview.put("toAccountId", request.getToAccountId().toString());
            preview.put("toAccount", destination.getName());
            preview.put("toAccountName", destination.getName());
        }
        if (category != null) {
            preview.put("categoryId", request.getCategoryId().toString());
            preview.put("category", category.getName());
            preview.put("categoryName", category.getName());
        }
        preview.put("date", request.getTransactionDate().toString());
        preview.put("transactionDate", request.getTransactionDate().toString());
        preview.put("description", request.getDescription());
        preview.put("note", request.getNote() != null ? request.getNote() : request.getDescription());
        return new PreparedAction("Tạo giao dịch " + request.getTransactionType().name().toLowerCase(Locale.ROOT),
                request.getAmount().toPlainString() + " " + request.getCurrencyCode() + " · " + source.getName(), preview);
    }

    private PreparedAction prepareBudget(UUID userId, Map<String, Object> args) {
        CreateBudgetRequest request = budgetRequest(userId, args);
        validateBean(request);
        if (request.getEndDate().isBefore(request.getStartDate())) throw schema("endDate must not be before startDate");
        BigDecimal sum = BigDecimal.ZERO;
        List<Map<String, Object>> itemPreview = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (CreateBudgetRequest.BudgetItemRequest item : request.getItems()) {
            if (!seen.add(item.getCategoryId())) throw schema("Duplicate category in budget");
            Category category = categoryRepository.findByIdAndUserIdOrSystem(item.getCategoryId(), userId)
                    .orElseThrow(() -> forbiddenResource("items.categoryId"));
            sum = sum.add(item.getAmount());
            itemPreview.add(Map.of("categoryId", category.getId(), "category", category.getName(), "amount", item.getAmount()));
        }
        if (sum.compareTo(request.getTotalAmount()) != 0) throw schema("Sum of item amounts must equal totalAmount");
        if (budgetRepository.existsOverlappingBudget(userId, request.getPeriodType(), request.getStartDate(), request.getEndDate(), null))
            throw new BusinessException("Bạn đã có một ngân sách cho khoảng thời gian này rồi. Vui lòng kiểm tra lại trong mục Quản lý Ngân sách!", "FINAI_STALE_PROPOSAL", HttpStatus.CONFLICT);
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("name", request.getName()); preview.put("periodType", request.getPeriodType());
        preview.put("startDate", request.getStartDate()); preview.put("endDate", request.getEndDate());
        preview.put("totalAmount", request.getTotalAmount()); preview.put("currency", request.getCurrencyCode());
        preview.put("items", itemPreview);
        return new PreparedAction("Tạo ngân sách " + request.getName(),
                request.getStartDate() + " – " + request.getEndDate(), preview);
    }

    private PreparedAction prepareGoal(UUID userId, Map<String, Object> args) {
        CreateGoalRequest request = goalRequest(userId, args);
        validateBean(request);
        if (request.getTargetAmount() == null || request.getTargetAmount().signum() <= 0)
            throw schema("targetAmount must be greater than 0");
        if (request.getTargetDate() != null && request.getTargetDate().isBefore(LocalDate.now()))
            throw schema("targetDate cannot be in the past");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "GOAL"); preview.put("name", request.getName());
        preview.put("goalType", request.getGoalType()); preview.put("targetAmount", request.getTargetAmount());
        preview.put("amount", request.getTargetAmount()); preview.put("currency", request.getCurrencyCode());
        preview.put("targetDate", request.getTargetDate()); preview.put("priority", request.getPriority());
        preview.put("description", request.getDescription()); preview.put("balanceImpact", false);
        return new PreparedAction("Tạo mục tiêu " + request.getName(),
                "Mục tiêu " + request.getTargetAmount().toPlainString() + " " + request.getCurrencyCode(), preview);
    }

    private PreparedAction prepareGoalContribution(UUID userId, Map<String, Object> args) {
        UUID goalId = uuid(args, "goalId", true);
        GoalResponse goal = goalService.getGoalById(userId, goalId);
        if (goal.getStatus() != GoalStatus.IN_PROGRESS)
            throw conflict("Goal is no longer accepting contributions");
        ContributeRequest request = contributionRequest(userId, args);
        validateBean(request);
        Account account = request.getSourceAccountId() == null ? null : ownedAccount(userId, request.getSourceAccountId(), "sourceAccountId");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "GOAL_CONTRIBUTION"); preview.put("goalId", goalId);
        preview.put("entityName", goal.getName()); preview.put("amount", request.getAmount());
        preview.put("currency", goal.getCurrencyCode()); preview.put("beforeAmount", goal.getCurrentAmount());
        preview.put("afterAmount", goal.getCurrentAmount().add(request.getAmount()));
        preview.put("accountId", request.getSourceAccountId());
        preview.put("accountName", account == null ? null : account.getName());
        preview.put("balanceImpact", account != null);
        preview.put("warning", account == null ? "Không chọn ví: nghiệp vụ chỉ ghi nhận đóng góp và không thay đổi số dư ví." : "Số tiền sẽ được trừ khỏi ví khi xác nhận.");
        preview.put("note", request.getNote());
        return new PreparedAction("Đóng góp mục tiêu " + goal.getName(),
                request.getAmount().toPlainString() + " " + goal.getCurrencyCode(), preview);
    }

    private PreparedAction prepareDebt(UUID userId, Map<String, Object> args) {
        CreateDebtRequest request = debtRequest(userId, args);
        validateBean(request);
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "DEBT"); preview.put("debtType", request.getDebtType());
        preview.put("entityName", request.getDebtType().equals("BORROWING") ? request.getCreditorName() : request.getDebtorName());
        preview.put("amount", request.getPrincipalAmount()); preview.put("currency", request.getCurrencyCode());
        preview.put("startDate", request.getStartDate()); preview.put("nextPaymentDate", request.getNextPaymentDate());
        preview.put("dueDate", request.getDueDate());
        preview.put("paymentFrequency", request.getPaymentFrequency()); preview.put("paymentAmount", request.getMonthlyPayment());
        preview.put("interestRate", request.getInterestRate()); preview.put("balanceImpact", false);
        preview.put("warning", "Tạo khoản nợ chỉ ghi nhận công nợ, không tự thay đổi số dư ví.");
        preview.put("note", request.getNote());
        return new PreparedAction(request.getDebtType().equals("BORROWING") ? "Tạo khoản đi vay" : "Tạo khoản cho vay",
                request.getPrincipalAmount().toPlainString() + " " + request.getCurrencyCode(), preview);
    }

    private PreparedAction prepareDebtPayment(UUID userId, Map<String, Object> args) {
        UUID debtId = uuid(args, "debtId", true);
        DebtDetailResponse debt = debtService.getDebtById(userId, debtId);
        if (debt.getStatus() != DebtStatus.ACTIVE && debt.getStatus() != DebtStatus.OVERDUE)
            throw conflict("Debt is no longer accepting payments");
        RecordPaymentRequest request = debtPaymentRequest(userId, args);
        validateBean(request);
        BigDecimal principal = request.getPrincipalPaid() == null ? request.getAmount() : request.getPrincipalPaid();
        if (debt.getRemainingAmount() != null && principal.compareTo(debt.getRemainingAmount()) > 0)
            throw schema("principalPaid cannot exceed remaining debt");
        Account account = request.getAccountId() == null ? null : ownedAccount(userId, request.getAccountId(), "accountId");
        String party = debt.getDebtType() == DebtType.BORROWING ? debt.getCreditorName() : debt.getDebtorName();
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "DEBT_PAYMENT"); preview.put("debtId", debtId);
        preview.put("entityName", party); preview.put("debtType", debt.getDebtType());
        preview.put("amount", request.getAmount()); preview.put("currency", debt.getCurrencyCode());
        preview.put("beforeAmount", debt.getRemainingAmount());
        preview.put("afterAmount", debt.getRemainingAmount() == null ? null : debt.getRemainingAmount().subtract(principal));
        preview.put("date", request.getPaymentDate()); preview.put("accountId", request.getAccountId());
        preview.put("accountName", account == null ? null : account.getName()); preview.put("balanceImpact", account != null);
        preview.put("warning", account == null ? "Không chọn ví: chỉ ghi nhận thanh toán, không tạo giao dịch và không đổi số dư ví." :
                (debt.getDebtType() == DebtType.BORROWING ? "Số tiền sẽ được trừ khỏi ví khi xác nhận." : "Số tiền sẽ được cộng vào ví khi xác nhận."));
        preview.put("note", request.getNote());
        return new PreparedAction(debt.getDebtType() == DebtType.BORROWING ? "Ghi nhận trả nợ" : "Ghi nhận thu nợ",
                request.getAmount().toPlainString() + " " + debt.getCurrencyCode() + " · " + party, preview);
    }

    private PreparedAction prepareBudgetUpdate(UUID userId, Map<String, Object> args) {
        UUID budgetId = uuid(args, "budgetId", true);
        BudgetResponse budget = budgetService.getBudgetById(userId, budgetId);
        UpdateBudgetRequest request = budgetUpdateRequest(args);
        validateBean(request);
        if (!Objects.equals(budget.getVersion(), request.getVersion()))
            throw new BusinessException("Budget changed since it was read", "FINAI_STALE_PROPOSAL", HttpStatus.CONFLICT);
        if (request.getName() == null && request.getTotalAmount() == null && request.getAlertThresholdPercentage() == null && request.getRolloverEnabled() == null)
            throw schema("At least one budget field must be updated");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "BUDGET_UPDATE"); preview.put("budgetId", budgetId);
        preview.put("entityName", request.getName() == null ? budget.getName() : request.getName());
        preview.put("beforeAmount", budget.getTotalAmount());
        preview.put("afterAmount", request.getTotalAmount() == null ? budget.getTotalAmount() : request.getTotalAmount());
        preview.put("currency", budget.getCurrencyCode()); preview.put("version", request.getVersion());
        preview.put("beforeAlertThreshold", budget.getAlertThresholdPercentage());
        preview.put("afterAlertThreshold", request.getAlertThresholdPercentage() == null ? budget.getAlertThresholdPercentage() : request.getAlertThresholdPercentage());
        preview.put("balanceImpact", false);
        return new PreparedAction("Cập nhật ngân sách " + budget.getName(),
                "Hạn mức " + preview.get("beforeAmount") + " → " + preview.get("afterAmount"), preview);
    }

    private PreparedAction prepareSchedule(UUID userId, Map<String, Object> args) {
        CreateScheduleRequest request = scheduleRequest(userId, args);
        validateBean(request);
        recurrenceService.generateRecurrenceText(request.getRecurrenceRule());
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "SCHEDULE"); preview.put("entityName", request.getName());
        preview.put("scheduleType", request.getScheduleType()); preview.put("startDate", request.getStartDate());
        preview.put("endDate", request.getEndDate()); preview.put("recurrenceRule", request.getRecurrenceRule());
        preview.put("autoExecute", request.getAutoExecute()); preview.put("balanceImpact", false);
        if (request.isTransaction()) {
            TransactionTemplate template = request.getTransactionTemplate();
            preview.put("transactionType", template.getTransactionType()); preview.put("amount", template.getAmount());
            preview.put("currency", template.getCurrencyCode());
            preview.put("accountName", ownedAccount(userId, template.getAccountId(), "accountId").getName());
            preview.put("warning", Boolean.TRUE.equals(request.getAutoExecute())
                    ? "Lịch này có thể tự động tạo giao dịch và thay đổi số dư ở các kỳ đến hạn."
                    : "Tạo lịch không đổi số dư ngay; mỗi kỳ vẫn cần thực hiện giao dịch.");
        } else {
            preview.put("note", request.getReminderMessage());
        }
        return new PreparedAction("Tạo lịch " + request.getName(), request.getRecurrenceRule(), preview);
    }

    private PreparedAction prepareScheduleUpdate(UUID userId, Map<String, Object> args) {
        Long scheduleId = longValue(args, "scheduleId", true);
        ScheduleDetailResponse schedule = scheduleService.getScheduleById(scheduleId, userId);
        UpdateScheduleRequest request = scheduleUpdateRequest(args);
        validateBean(request);
        if (!request.hasUpdates()) throw schema("At least one schedule field must change");
        if (request.getRecurrenceRule() != null) recurrenceService.generateRecurrenceText(request.getRecurrenceRule());
        if (request.getEndDate() != null && !request.getEndDate().isAfter(schedule.getStartDate()))
            throw schema("endDate must be after the schedule startDate");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "SCHEDULE_UPDATE"); preview.put("scheduleId", scheduleId);
        preview.put("entityName", schedule.getName()); preview.put("beforeName", schedule.getName());
        preview.put("afterName", request.getName() == null ? schedule.getName() : request.getName());
        preview.put("beforeDate", schedule.getEndDate());
        preview.put("afterDate", request.getEndDate() == null ? schedule.getEndDate() : request.getEndDate());
        preview.put("recurrenceRule", request.getRecurrenceRule()); preview.put("balanceImpact", false);
        return new PreparedAction("Cập nhật lịch " + schedule.getName(), "Thay đổi cài đặt lịch tài chính", preview);
    }

    private PreparedAction prepareAccount(Map<String, Object> args) {
        CreateAccountRequest request = accountRequest(args);
        validateBean(request);
        if (request.getAccountType() == AccountType.CREDIT_CARD
                && (request.getCreditLimit() == null || request.getCreditLimit().signum() <= 0))
            throw schema("creditLimit must be greater than 0 for CREDIT_CARD");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "ACCOUNT"); preview.put("entityName", request.getName());
        preview.put("accountType", request.getAccountType()); preview.put("amount", request.getInitialBalance());
        preview.put("currency", "VND"); preview.put("balanceImpact", true);
        preview.put("warning", "Số dư ban đầu sẽ được tính vào tổng tài sản nhưng không tạo giao dịch lịch sử.");
        preview.put("note", request.getDescription());
        return new PreparedAction("Tạo tài khoản " + request.getName(),
                "Số dư ban đầu " + request.getInitialBalance().toPlainString() + " VND", preview);
    }

    private PreparedAction prepareGroupExpense(UUID userId, Map<String, Object> args) {
        UUID groupId = uuid(args, "groupId", true);
        var group = groupService.getGroupDetail(groupId, userId); // membership check
        CreateExpenseRequest request = groupExpenseRequest(userId, args);
        validateBean(request);
        if (request.getExpenseDate().isAfter(LocalDate.now())) throw schema("expenseDate cannot be in the future");
        if (categoryRepository.findByIdAndUserIdOrSystem(request.getCategoryId(), userId).isEmpty())
            throw forbiddenResource("categoryId");
        Set<UUID> memberIds = groupService.getMembers(groupId, userId).stream()
                .map(MemberResponse::getUserId).collect(java.util.stream.Collectors.toSet());
        Set<UUID> splitIds = new HashSet<>();
        BigDecimal splitTotal = BigDecimal.ZERO;
        for (CreateExpenseRequest.ExpenseSplitDto split : request.getSplits()) {
            if (!memberIds.contains(split.getUserId())) throw forbiddenResource("splits.userId");
            if (!splitIds.add(split.getUserId())) throw schema("Duplicate member in splits");
            splitTotal = splitTotal.add(split.getAmount());
        }
        if (splitTotal.compareTo(request.getAmount()) != 0) throw schema("Split amounts must equal expense amount");
        String sourceName;
        if ("PERSONAL_ACCOUNT".equals(request.getPaymentSource())) {
            if (request.getSourceAccountId() == null) throw schema("sourceAccountId is required for PERSONAL_ACCOUNT");
            sourceName = ownedAccount(userId, request.getSourceAccountId(), "sourceAccountId").getName();
        } else {
            if (request.getSourceAccountId() != null) throw schema("sourceAccountId must be absent for GROUP_FUND");
            var fund = groupFundService.getFund(groupId, userId);
            if (fund.getBalance().compareTo(request.getAmount()) < 0) throw conflict("Group fund balance is insufficient");
            sourceName = "Quỹ nhóm";
        }
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "GROUP_EXPENSE"); preview.put("entityName", group.getName());
        preview.put("groupId", groupId); preview.put("amount", request.getAmount()); preview.put("currency", "VND");
        preview.put("accountName", sourceName); preview.put("date", request.getExpenseDate());
        preview.put("splitMethod", request.getSplitMethod()); preview.put("splitCount", request.getSplits().size());
        preview.put("balanceImpact", true); preview.put("note", request.getDescription());
        return new PreparedAction("Tạo khoản chi nhóm " + group.getName(), request.getDescription(), preview);
    }

    private PreparedAction prepareGroupFundContribution(UUID userId, Map<String, Object> args) {
        UUID groupId = uuid(args, "groupId", true);
        var group = groupService.getGroupDetail(groupId, userId); // membership check
        var fund = groupFundService.getFund(groupId, userId);
        ContributeGroupFundRequest request = groupFundContributionRequest(userId, args);
        validateBean(request);
        if (request.getContributedAt().isAfter(LocalDate.now())) throw schema("contributedAt cannot be in the future");
        Account account = ownedAccount(userId, request.getSourceAccountId(), "sourceAccountId");
        if (!fund.getCurrency().equalsIgnoreCase(account.getCurrencyCode()))
            throw schema("Source account currency must match group fund currency");
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "GROUP_FUND_CONTRIBUTION"); preview.put("entityName", group.getName());
        preview.put("groupId", groupId); preview.put("amount", request.getAmount());
        preview.put("currency", fund.getCurrency()); preview.put("accountName", account.getName());
        preview.put("date", request.getContributedAt()); preview.put("balanceImpact", true);
        preview.put("warning", "Xác nhận sẽ trừ ví nguồn và tăng số dư quỹ nhóm trong cùng giao dịch.");
        preview.put("note", request.getNote());
        return new PreparedAction("Nộp quỹ nhóm " + group.getName(), request.getAmount().toPlainString() + " " + fund.getCurrency(), preview);
    }

    private PreparedAction prepareChildSpend(UUID userId, Map<String, Object> args) {
        UUID groupId = uuid(args, "groupId", false);
        UUID walletId = uuid(args, "walletId", false);

        Optional<ChildWallet> cwOpt = childWalletRepository.findByUserId(userId);
        if (cwOpt.isPresent()) {
            walletId = cwOpt.get().getId();
            groupId = cwOpt.get().getGroupId();
        } else {
            if (groupId == null) groupId = uuid(args, "groupId", true);
            if (walletId == null) walletId = uuid(args, "walletId", true);
        }

        var group = groupService.getGroupDetail(groupId, userId);
        var wallet = childWalletService.getWallet(groupId, walletId, userId);
        CreateSpendRequestRequest request = childSpendRequest(userId, args);
        validateBean(request);

        boolean isIncome = request.getDescription() != null && (
                request.getDescription().startsWith("[INCOME_DEPOSIT] ")
                || request.getDescription().startsWith("[INCOME_GIFT] ")
                || request.getDescription().startsWith("[INCOME_CHORE] ")
                || request.getDescription().startsWith("[MONEY_REQUEST] ")
        );

        if (!isIncome && wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw schema("Số dư ví của bé không đủ để chi tiêu");
        }

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "CHILD_WALLET_TRANSACTION");
        preview.put("entityName", "Ví bé " + wallet.getChildName());
        preview.put("accountName", "Ví bé " + wallet.getChildName());
        preview.put("groupId", groupId);
        preview.put("walletId", walletId);
        preview.put("amount", request.getAmount());
        preview.put("currency", "VND");
        preview.put("isIncome", isIncome);
        preview.put("transactionType", isIncome ? "INCOME" : "EXPENSE");
        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId())
                    .ifPresent(c -> preview.put("categoryName", c.getName()));
        }
        preview.put("balanceImpact", true);
        preview.put("note", request.getDescription());
        preview.put("description", request.getDescription());
        return new PreparedAction((isIncome ? "Cộng tiền ví bé " : "Chi tiêu ví bé ") + wallet.getChildName(),
                request.getAmount().toPlainString() + " VND", preview);
    }

    private PreparedAction prepareChildDeposit(UUID userId, Map<String, Object> args) {
        UUID groupId = uuid(args, "groupId", true);
        UUID walletId = uuid(args, "walletId", true);
        var group = groupService.getGroupDetail(groupId, userId);
        var wallet = childWalletService.getWallet(groupId, walletId, userId);
        DepositWalletRequest request = childDepositRequest(userId, args);
        validateBean(request);

        String source = request.getSource();
        if ("GROUP_FUND".equalsIgnoreCase(source)) {
            var fund = groupFundService.getFund(groupId, userId);
            if (fund.getBalance().compareTo(request.getAmount()) < 0) {
                throw schema("Số dư quỹ nhóm không đủ để cấp cho bé");
            }
        } else if ("PERSONAL_ACCOUNT".equalsIgnoreCase(source) || request.getSourceAccountId() != null) {
            if (request.getSourceAccountId() == null) {
                throw schema("Vui lòng chọn ví cá nhân để trừ tiền nạp cho bé");
            }
            Account parentAccount = ownedAccount(userId, request.getSourceAccountId(), "sourceAccountId");
            if (parentAccount.getBalance().compareTo(request.getAmount()) < 0) {
                throw schema("Số dư ví cá nhân không đủ để nạp cho bé");
            }
        }

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("entityType", "CHILD_WALLET_DEPOSIT");
        preview.put("entityName", "Cấp tiền ví bé " + wallet.getChildName());
        preview.put("accountName", "Ví bé " + wallet.getChildName());
        preview.put("groupId", groupId);
        preview.put("walletId", walletId);
        preview.put("amount", request.getAmount());
        preview.put("currency", "VND");
        preview.put("source", source);
        preview.put("isIncome", true);
        preview.put("transactionType", "INCOME");
        preview.put("balanceImpact", true);
        preview.put("note", request.getDescription());
        preview.put("description", request.getDescription());
        return new PreparedAction("Cấp tiền cho bé " + wallet.getChildName(),
                request.getAmount().toPlainString() + " VND", preview);
    }

    private CreateTransactionRequest transactionRequest(UUID userId, Map<String, Object> a) {
        UUID accountId = resolveAccount(userId, a.get("accountId"), true);
        UUID toAccountId = resolveAccount(userId, a.get("toAccountId"), false);
        UUID categoryId = resolveCategory(userId, a.get("categoryId"), false);

        return CreateTransactionRequest.builder()
                .transactionType(enumValue(a, "transactionType", TransactionType.class, null))
                .accountId(accountId).toAccountId(toAccountId)
                .amount(decimal(a, "amount", null)).currencyCode(string(a, "currencyCode", null, 3))
                .description(string(a, "description", null, 500)).transactionDate(date(a, "transactionDate", null))
                .transactionTime(time(a, "transactionTime")).categoryId(categoryId)
                .note(string(a, "note", null, 1000)).transferFee(decimal(a, "transferFee", null)).build();
    }

    private UUID resolveAccount(UUID userId, Object raw, boolean required) {
        if (raw == null) {
            if (!required) return null;
            // Fallback lấy ví đầu tiên của user nếu chưa truyền
            List<Account> accounts = accountRepository.findAllByUserId(userId);
            if (!accounts.isEmpty()) return accounts.get(0).getId();
            throw schema("accountId is required");
        }
        String str = String.valueOf(raw).trim();
        try {
            return UUID.fromString(str);
        } catch (IllegalArgumentException e) {
            // Khớp theo tên ví (ví dụ: vietcombank, tiền mặt,...)
            List<Account> accounts = accountRepository.findAllByUserId(userId);
            String norm = normalize(str);
            for (Account acc : accounts) {
                if (normalize(acc.getName()).contains(norm) || norm.contains(normalize(acc.getName()))) {
                    return acc.getId();
                }
            }
            if (!accounts.isEmpty()) return accounts.get(0).getId();
            throw schema("Không tìm thấy ví phù hợp cho: " + str);
        }
    }

    private UUID resolveCategoryWithDescription(UUID userId, Object raw, String description, boolean required) {
        String descNorm = normalize(description);
        // Ưu tiên khớp mô tả giao dịch với danh mục giáo dục (bút, thước, sách, vở, học phí,...)
        if (descNorm.contains("but") || descNorm.contains("thuoc") || descNorm.contains("sach") || descNorm.contains("vo")
                || descNorm.contains("hoc") || descNorm.contains("truong") || descNorm.contains("lop")) {
            List<Category> categories = categoryRepository.findAllByUserIdOrSystem(userId);
            for (Category c : categories) {
                if (normalize(c.getName()).contains("giaoduc") || normalize(c.getName()).contains("hoc")) {
                    return c.getId();
                }
            }
        }
        if (descNorm.contains("an") || descNorm.contains("uong") || descNorm.contains("com") || descNorm.contains("trua")
                || descNorm.contains("sang") || descNorm.contains("toi") || descNorm.contains("tra") || descNorm.contains("banh")) {
            List<Category> categories = categoryRepository.findAllByUserIdOrSystem(userId);
            for (Category c : categories) {
                if (normalize(c.getName()).contains("anuong")) {
                    return c.getId();
                }
            }
        }
        return resolveCategory(userId, raw, required);
    }

    private UUID resolveCategory(UUID userId, Object raw, boolean required) {
        if (raw == null) {
            if (!required) return null;
            throw schema("categoryId is required");
        }
        String str = String.valueOf(raw).trim();
        try {
            return UUID.fromString(str);
        } catch (IllegalArgumentException e) {
            List<Category> categories = categoryRepository.findAllByUserIdOrSystem(userId);
            String norm = normalize(str);
            for (Category c : categories) {
                if (normalize(c.getName()).contains(norm) || norm.contains(normalize(c.getName()))) {
                    return c.getId();
                }
            }
            // Mặc định danh mục 'Khác' nếu không khớp
            for (Category c : categories) {
                if (c.getName().contains("Khác") || c.getName().contains("khác")) return c.getId();
            }
            if (!categories.isEmpty()) return categories.get(0).getId();
            throw schema("Không tìm thấy danh mục: " + str);
        }
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    @SuppressWarnings("unchecked")
    private CreateBudgetRequest budgetRequest(UUID userId, Map<String, Object> a) {
        Object rawItems = a.get("items");
        if (!(rawItems instanceof List<?> list) || list.isEmpty()) throw schema("items must be a non-empty array");
        List<CreateBudgetRequest.BudgetItemRequest> items = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> map)) throw schema("Each budget item must be an object");
            Set<String> keys = new HashSet<>(); map.keySet().forEach(k -> keys.add(String.valueOf(k)));
            if (!Set.of("categoryId", "amount", "alertThresholdPercentage").containsAll(keys)) throw schema("Unknown budget item argument");
            Map<String, Object> item = (Map<String, Object>) map;
            UUID catId = resolveCategory(userId, item.get("categoryId"), true);
            items.add(CreateBudgetRequest.BudgetItemRequest.builder().categoryId(catId)
                    .amount(decimal(item, "amount", null)).alertThresholdPercentage(integer(item, "alertThresholdPercentage", 80, 0, 100)).build());
        }
        return CreateBudgetRequest.builder().name(string(a, "name", null, 100))
                .periodType(enumValue(a, "periodType", BudgetPeriodType.class, null))
                .startDate(date(a, "startDate", null)).endDate(date(a, "endDate", null))
                .totalAmount(decimal(a, "totalAmount", null)).currencyCode(string(a, "currencyCode", null, 3))
                .rolloverEnabled(bool(a, "rolloverEnabled", false))
                .alertThresholdPercentage(integer(a, "alertThresholdPercentage", 80, 0, 100)).items(items).build();
    }

    private CreateGoalRequest goalRequest(UUID userId, Map<String, Object> a) {
        UUID accountId = uuid(a, "accountId", false);
        if (accountId != null) ownedAccount(userId, accountId, "accountId");
        return CreateGoalRequest.builder()
                .name(string(a, "name", null, 200))
                .goalType(enumValue(a, "goalType", GoalType.class, null))
                .targetAmount(decimal(a, "targetAmount", null)).currentAmount(BigDecimal.ZERO)
                .currencyCode(string(a, "currencyCode", "VND", 3))
                .targetDate(date(a, "targetDate", null))
                .priority(enumValue(a, "priority", GoalPriority.class, GoalPriority.MEDIUM))
                .description(string(a, "description", null, 1000))
                .autoSaveEnabled(false).accountId(accountId).build();
    }

    private ContributeRequest contributionRequest(UUID userId, Map<String, Object> a) {
        UUID accountId = uuid(a, "sourceAccountId", false);
        if (accountId != null) ownedAccount(userId, accountId, "sourceAccountId");
        return ContributeRequest.builder().amount(decimal(a, "amount", null))
                .note(string(a, "note", null, 500)).sourceAccountId(accountId).build();
    }

    private CreateDebtRequest debtRequest(UUID userId, Map<String, Object> a) {
        String debtType = string(a, "debtType", null, 20);
        String party = string(a, "counterpartyName", null, 255);
        UUID accountId = uuid(a, "accountId", false);
        UUID categoryId = uuid(a, "categoryId", false);
        if (accountId != null) ownedAccount(userId, accountId, "accountId");
        if (categoryId != null && categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId).isEmpty())
            throw forbiddenResource("categoryId");
        return CreateDebtRequest.builder()
                .debtType(debtType)
                .creditorName("BORROWING".equals(debtType) ? party : null)
                .debtorName("LENDING".equals(debtType) ? party : null)
                .principalAmount(decimal(a, "principalAmount", null))
                .currencyCode(string(a, "currencyCode", "VND", 3))
                .interestRate(decimal(a, "interestRate", null))
                .interestType(enumValue(a, "interestType", InterestType.class, null))
                .paymentFrequency(enumValue(a, "paymentFrequency", PaymentFrequency.class, null))
                .monthlyPayment(decimal(a, "paymentAmount", null))
                .nextPaymentDate(date(a, "nextPaymentDate", null))
                .startDate(date(a, "startDate", null)).dueDate(date(a, "dueDate", null))
                .accountId(accountId).categoryId(categoryId)
                .reminderEnabled(bool(a, "reminderEnabled", false))
                .reminderDaysBefore(nullableInteger(a, "reminderDaysBefore", 0, 365))
                .description(string(a, "description", null, 5000)).note(string(a, "note", null, 1000)).build();
    }

    private RecordPaymentRequest debtPaymentRequest(UUID userId, Map<String, Object> a) {
        UUID accountId = uuid(a, "accountId", false);
        if (accountId != null) ownedAccount(userId, accountId, "accountId");
        return RecordPaymentRequest.builder().amount(decimal(a, "amount", null))
                .principalPaid(decimal(a, "principalPaid", null)).interestPaid(decimal(a, "interestPaid", null))
                .paymentDate(date(a, "paymentDate", null)).paymentMethod(string(a, "paymentMethod", null, 50))
                .accountId(accountId).note(string(a, "note", null, 1000))
                .createTransaction(accountId != null).build();
    }

    private UpdateBudgetRequest budgetUpdateRequest(Map<String, Object> a) {
        return UpdateBudgetRequest.builder().name(string(a, "name", null, 100))
                .totalAmount(decimal(a, "totalAmount", null))
                .alertThresholdPercentage(nullableInteger(a, "alertThresholdPercentage", 0, 100))
                .rolloverEnabled(a.containsKey("rolloverEnabled") ? bool(a, "rolloverEnabled", false) : null)
                .version(integer(a, "version", -1, 0, Integer.MAX_VALUE)).build();
    }

    private CreateScheduleRequest scheduleRequest(UUID userId, Map<String, Object> a) {
        String scheduleType = string(a, "scheduleType", null, 20);
        TransactionTemplate template = null;
        if ("TRANSACTION".equals(scheduleType)) {
            String transactionType = string(a, "transactionType", null, 20);
            UUID accountId = uuid(a, "accountId", true);
            UUID toAccountId = uuid(a, "toAccountId", false);
            UUID categoryId = uuid(a, "categoryId", false);
            ownedAccount(userId, accountId, "accountId");
            if ("TRANSFER".equals(transactionType)) {
                if (toAccountId == null || toAccountId.equals(accountId))
                    throw schema("A distinct toAccountId is required for TRANSFER schedule");
                ownedAccount(userId, toAccountId, "toAccountId");
                if (categoryId != null) throw schema("categoryId must be absent for TRANSFER schedule");
            } else {
                if (categoryId == null) throw schema("categoryId is required for income/expense schedule");
                if (categoryRepository.findByIdAndUserIdOrSystem(categoryId, userId).isEmpty())
                    throw forbiddenResource("categoryId");
            }
            template = TransactionTemplate.builder().transactionType(transactionType).accountId(accountId)
                    .toAccountId(toAccountId).amount(decimal(a, "amount", null))
                    .currencyCode(string(a, "currencyCode", "VND", 3)).categoryId(categoryId)
                    .description(string(a, "description", null, 500)).note(string(a, "note", null, 1000)).build();
        } else if (Boolean.TRUE.equals(a.get("autoExecute"))) {
            throw schema("autoExecute is only supported for TRANSACTION schedules");
        }
        return CreateScheduleRequest.builder().scheduleType(scheduleType)
                .name(string(a, "name", null, 255)).recurrenceRule(string(a, "recurrenceRule", null, 500))
                .startDate(date(a, "startDate", null)).endDate(date(a, "endDate", null))
                .transactionTemplate(template).reminderMessage(string(a, "reminderMessage", null, 1000))
                .autoExecute(bool(a, "autoExecute", false)).notificationEnabled(bool(a, "notificationEnabled", true))
                .notificationTimeBeforeMinutes(nullableInteger(a, "notificationTimeBeforeMinutes", 0, 10080))
                .notificationChannels(enumList(a, "notificationChannels", NotificationChannel.class)).build();
    }

    private UpdateScheduleRequest scheduleUpdateRequest(Map<String, Object> a) {
        return UpdateScheduleRequest.builder().name(string(a, "name", null, 255))
                .recurrenceRule(string(a, "recurrenceRule", null, 500)).endDate(date(a, "endDate", null))
                .reminderMessage(string(a, "reminderMessage", null, 1000))
                .autoExecute(a.containsKey("autoExecute") ? bool(a, "autoExecute", false) : null)
                .notificationEnabled(a.containsKey("notificationEnabled") ? bool(a, "notificationEnabled", true) : null)
                .notificationTimeBeforeMinutes(nullableInteger(a, "notificationTimeBeforeMinutes", 0, 10080))
                .notificationChannels(enumList(a, "notificationChannels", NotificationChannel.class)).build();
    }

    private CreateAccountRequest accountRequest(Map<String, Object> a) {
        return CreateAccountRequest.builder().name(string(a, "name", null, 100))
                .accountType(enumValue(a, "accountType", AccountType.class, null))
                .initialBalance(signedDecimal(a, "initialBalance", null))
                .bankId(string(a, "bankId", null, 36)).accountNumber(string(a, "accountNumber", null, 100))
                .phoneNumber(string(a, "phoneNumber", null, 16)).cardNumberLast4(string(a, "cardNumberLast4", null, 4))
                .creditLimit(decimal(a, "creditLimit", null))
                .billingCycleDay(nullableInteger(a, "billingCycleDay", 1, 31))
                .paymentDueDay(nullableInteger(a, "paymentDueDay", 1, 31))
                .icon(string(a, "icon", null, 10)).color(string(a, "color", null, 7))
                .description(string(a, "description", null, 500))
                .isIncludedInTotal(a.containsKey("isIncludedInTotal") ? bool(a, "isIncludedInTotal", true) : true).build();
    }

    @SuppressWarnings("unchecked")
    private CreateExpenseRequest groupExpenseRequest(UUID userId, Map<String, Object> a) {
        Object rawSplits = a.get("splits");
        if (!(rawSplits instanceof List<?> list) || list.isEmpty()) throw schema("splits must be a non-empty array");
        List<CreateExpenseRequest.ExpenseSplitDto> splits = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> map)) throw schema("Each split must be an object");
            Set<String> keys = new HashSet<>(); map.keySet().forEach(k -> keys.add(String.valueOf(k)));
            if (!Set.of("userId", "amount").containsAll(keys)) throw schema("Unknown split argument");
            Map<String, Object> split = (Map<String, Object>) map;
            splits.add(new CreateExpenseRequest.ExpenseSplitDto(
                    uuid(split, "userId", true), decimal(split, "amount", null), null, null));
        }
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setDescription(string(a, "description", null, 300)); request.setAmount(decimal(a, "amount", null));
        request.setPaidByUserId(userId); request.setPaymentSource(string(a, "paymentSource", null, 30));
        request.setSourceAccountId(uuid(a, "sourceAccountId", false)); request.setCategoryId(uuid(a, "categoryId", true));
        request.setSplitMethod(string(a, "splitMethod", null, 20)); request.setExpenseDate(date(a, "expenseDate", null));
        request.setNotes(string(a, "notes", null, 1000)); request.setSplits(splits);
        return request;
    }

    private ContributeGroupFundRequest groupFundContributionRequest(UUID userId, Map<String, Object> a) {
        UUID accountId = uuid(a, "sourceAccountId", true);
        ownedAccount(userId, accountId, "sourceAccountId");
        ContributeGroupFundRequest request = new ContributeGroupFundRequest();
        request.setSourceAccountId(accountId); request.setAmount(decimal(a, "amount", null));
        request.setContributedAt(date(a, "contributedAt", null)); request.setNote(string(a, "note", null, 1000));
        return request;
    }

    private CreateSpendRequestRequest childSpendRequest(UUID userId, Map<String, Object> a) {
        String description = string(a, "description", null, 300);
        UUID categoryId = resolveCategoryWithDescription(userId, a.get("categoryId"), description, true);
        CreateSpendRequestRequest request = new CreateSpendRequestRequest();
        request.setAmount(decimal(a, "amount", null));
        request.setCategoryId(categoryId);
        request.setDescription(description);
        request.setNotes(string(a, "notes", null, 1000));
        return request;
    }

    private DepositWalletRequest childDepositRequest(UUID userId, Map<String, Object> a) {
        String source = string(a, "source", "PERSONAL_ACCOUNT", 30);
        UUID sourceAccountId = uuid(a, "sourceAccountId", false);
        if (sourceAccountId != null) {
            ownedAccount(userId, sourceAccountId, "sourceAccountId");
        }
        DepositWalletRequest request = new DepositWalletRequest();
        request.setAmount(decimal(a, "amount", null));
        request.setSource(source);
        request.setSourceAccountId(sourceAccountId);
        request.setDescription(string(a, "description", null, 300));
        return request;
    }

    private Account ownedAccount(UUID userId, UUID accountId, String field) {
        return accountRepository.findByIdAndUserId(accountId, userId).orElseThrow(() -> forbiddenResource(field));
    }

    private void validateBean(Object value) {
        Set<ConstraintViolation<Object>> errors = validator.validate(value);
        if (!errors.isEmpty()) throw schema(errors.iterator().next().getPropertyPath() + ": " + errors.iterator().next().getMessage());
    }
    private UUID uuid(Map<String, Object> a, String key, boolean required) {
        Object v = a.get(key); if (v == null) { if (required) throw schema(key + " is required"); return null; }
        try { return UUID.fromString(String.valueOf(v)); } catch (Exception e) { throw schema(key + " must be a UUID"); }
    }
    private BigDecimal decimal(Map<String, Object> a, String key, BigDecimal fallback) {
        Object v = a.get(key); if (v == null) return fallback;
        try { BigDecimal n = new BigDecimal(String.valueOf(v)); if (n.signum() < 0) throw new NumberFormatException(); return n; }
        catch (Exception e) { throw schema(key + " must be a non-negative number"); }
    }
    private BigDecimal signedDecimal(Map<String, Object> a, String key, BigDecimal fallback) {
        Object v = a.get(key); if (v == null) return fallback;
        try { return new BigDecimal(String.valueOf(v)); }
        catch (Exception e) { throw schema(key + " must be a number"); }
    }
    private Long longValue(Map<String, Object> a, String key, boolean required) {
        Object v = a.get(key); if (v == null) { if (required) throw schema(key + " is required"); return null; }
        try { long n = Long.parseLong(String.valueOf(v)); if (n < 1) throw new NumberFormatException(); return n; }
        catch (Exception e) { throw schema(key + " must be a positive integer"); }
    }
    private LocalDate date(Map<String, Object> a, String key, LocalDate fallback) {
        Object v = a.get(key); if (v == null) return fallback; try { return LocalDate.parse(String.valueOf(v)); } catch (Exception e) { throw schema(key + " must be ISO date"); }
    }
    private LocalTime time(Map<String, Object> a, String key) {
        Object v = a.get(key); if (v == null) return null; try { return LocalTime.parse(String.valueOf(v)); } catch (Exception e) { throw schema(key + " must be ISO time"); }
    }
    private String string(Map<String, Object> a, String key, String fallback, int max) {
        Object v = a.get(key); if (v == null) return fallback; String s = String.valueOf(v).trim(); if (s.length() > max) throw schema(key + " is too long"); return s;
    }
    private Integer integer(Map<String, Object> a, String key, int fallback, int min, int max) {
        Object v = a.get(key); if (v == null) return fallback; try { int n = Integer.parseInt(String.valueOf(v)); if (n < min || n > max) throw new NumberFormatException(); return n; } catch (Exception e) { throw schema(key + " is out of range"); }
    }
    private Integer nullableInteger(Map<String, Object> a, String key, int min, int max) {
        return a.get(key) == null ? null : integer(a, key, min, min, max);
    }
    private Boolean bool(Map<String, Object> a, String key, boolean fallback) {
        Object v = a.get(key); if (v == null) return fallback; if (v instanceof Boolean b) return b; if ("true".equals(v) || "false".equals(v)) return Boolean.valueOf(String.valueOf(v)); throw schema(key + " must be boolean");
    }
    private Set<String> stringSet(Map<String, Object> a, String key, Set<String> fallback,
                                  Set<String> allowed, int maxSize) {
        Object raw = a.get(key);
        if (raw == null) return fallback;
        if (!(raw instanceof List<?> list) || list.isEmpty() || list.size() > maxSize)
            throw schema(key + " must be a non-empty bounded array");
        Set<String> values = new LinkedHashSet<>();
        for (Object value : list) {
            String item = String.valueOf(value);
            if (!allowed.contains(item) || !values.add(item)) throw schema(key + " contains an unsupported or duplicate value");
        }
        return values;
    }
    private <E extends Enum<E>> E enumValue(Map<String, Object> a, String key, Class<E> type, E fallback) {
        Object v = a.get(key); if (v == null) return fallback; try { return Enum.valueOf(type, String.valueOf(v).toUpperCase(Locale.ROOT)); } catch (Exception e) { throw schema(key + " has an unsupported value"); }
    }
    private <E extends Enum<E>> List<E> enumList(Map<String, Object> a, String key, Class<E> type) {
        Object raw = a.get(key); if (raw == null) return null;
        if (!(raw instanceof List<?> list)) throw schema(key + " must be an array");
        List<E> result = new ArrayList<>();
        for (Object item : list) {
            try { result.add(Enum.valueOf(type, String.valueOf(item).toUpperCase(Locale.ROOT))); }
            catch (Exception e) { throw schema(key + " has an unsupported value"); }
        }
        if (new HashSet<>(result).size() != result.size()) throw schema(key + " contains duplicate values");
        return result;
    }
    private BusinessException schema(String message) { return new BusinessException(message, "FINAI_SCHEMA_INVALID", HttpStatus.BAD_REQUEST); }
    private BusinessException conflict(String message) { return new BusinessException(message, "FINAI_STATE_CONFLICT", HttpStatus.CONFLICT); }
    private BusinessException forbiddenResource(String field) { return new BusinessException("Resource is unavailable: " + field, "FINAI_RESOURCE_FORBIDDEN", HttpStatus.FORBIDDEN); }
    private BusinessException notAllowed() { return new BusinessException("Tool is not executable", "FINAI_TOOL_NOT_ALLOWED", HttpStatus.BAD_REQUEST); }
}
