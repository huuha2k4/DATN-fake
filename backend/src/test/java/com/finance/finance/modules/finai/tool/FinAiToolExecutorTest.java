package com.finance.finance.modules.finai.tool;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.account.service.AccountService;
import com.finance.finance.modules.budget.repository.BudgetRepository;
import com.finance.finance.modules.budget.service.BudgetService;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.debt.service.DebtService;
import com.finance.finance.modules.debt.dto.response.DebtListResponse;
import com.finance.finance.common.enums.*;
import com.finance.finance.modules.goal.service.GoalService;
import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.group.service.*;
import com.finance.finance.modules.schedule.service.ScheduleService;
import com.finance.finance.modules.schedule.service.RecurrenceService;
import com.finance.finance.modules.transaction.service.TransactionService;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class FinAiToolExecutorTest {
    @Mock TransactionService transactions;
    @Mock AccountService accounts;
    @Mock BudgetService budgets;
    @Mock GoalService goals;
    @Mock DebtService debts;
    @Mock ScheduleService schedules;
    @Mock RecurrenceService recurrence;
    @Mock GroupService groups;
    @Mock GroupExpenseService groupExpenses;
    @Mock GroupFundService groupFunds;
    @Mock GroupSettlementService settlements;
    @Mock ChildWalletService childWallets;
    @Mock ChildWalletRepository childWalletRepository;
    @Mock AccountRepository accountRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock BudgetRepository budgetRepository;
    @Mock Validator validator;
    @Mock FinAiToolRegistry registry;
    @InjectMocks FinAiToolExecutor executor;

    @BeforeEach
    void validDtos() {
        lenient().doReturn(java.util.Collections.emptySet()).when(validator).validate(any());
    }

    @Test
    void accountReadUsesOnlyTrustedUserIdentity() {
        UUID trustedUser = UUID.randomUUID();
        executor.executeRead(trustedUser, "get_accounts", Map.of("summaryOnly", true));
        verify(registry).validate("get_accounts", Map.of("summaryOnly", true), FinAiToolMode.READ);
        verify(accounts).getAccountsSummary(trustedUser, "VND");
    }

    @Test
    void groupReadDelegatesMembershipEnforcementToBusinessService() {
        UUID trustedUser = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        executor.executeRead(trustedUser, "get_group_finances",
                Map.of("groupId", groupId.toString(), "section", "balances"));
        verify(groupExpenses).getBalances(groupId, trustedUser);
    }

    @Test
    void rejectsReversedOverviewRangeBeforeQueryingServices() {
        assertThrows(BusinessException.class, () -> executor.executeRead(UUID.randomUUID(),
                "get_financial_overview", Map.of("fromDate", "2026-11-20", "toDate", "2026-11-01")));
    }

    @Test
    void rejectsUnboundedPageSize() {
        assertThrows(BusinessException.class, () -> executor.executeRead(UUID.randomUUID(),
                "get_groups", Map.of("pageSize", 500)));
    }

    @Test
    void overviewComparisonQueriesBothPeriodsWithoutRawHistory() {
        UUID user = UUID.randomUUID();
        executor.executeRead(user, "get_financial_overview", Map.of(
                "fromDate", "2026-11-01", "toDate", "2026-11-19",
                "comparisonFromDate", "2026-10-01", "comparisonToDate", "2026-10-31"));
        verify(transactions).getTransactionSummary(user,
                java.time.LocalDate.parse("2026-11-01"), java.time.LocalDate.parse("2026-11-19"), "day", null);
        verify(transactions).getTransactionSummary(user,
                java.time.LocalDate.parse("2026-10-01"), java.time.LocalDate.parse("2026-10-31"), "day", null);
        verifyNoInteractions(accounts, budgets, goals, debts);
    }

    @Test
    void scheduleRangeUsesOwnedUpcomingQuery() {
        UUID user = UUID.randomUUID();
        executor.executeRead(user, "get_schedules", Map.of(
                "fromDate", "2026-11-23", "toDate", "2026-11-29", "pageSize", 10));
        verify(schedules).getUpcomingSchedules(
                org.mockito.ArgumentMatchers.eq(user),
                org.mockito.ArgumentMatchers.eq(java.time.LocalDate.parse("2026-11-23")),
                org.mockito.ArgumentMatchers.eq(java.time.LocalDate.parse("2026-11-29")),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void debtCalendarRangeExpandsPeriodicDebtOccurrences() {
        UUID user = UUID.randomUUID();
        DebtListResponse.DebtSummaryItem debt = DebtListResponse.DebtSummaryItem.builder()
                .id(UUID.randomUUID()).debtType(DebtType.BORROWING).creditorName("Bank")
                .principalAmount(new java.math.BigDecimal("3000000"))
                .remaining(new java.math.BigDecimal("3000000"))
                .monthlyPayment(new java.math.BigDecimal("1000000"))
                .paymentFrequency(PaymentFrequency.MONTHLY)
                .nextPaymentDate(java.time.LocalDate.parse("2026-11-05"))
                .dueDate(java.time.LocalDate.parse("2027-01-05"))
                .status(DebtStatus.ACTIVE).build();
        when(debts.getDebts(user, null, null)).thenReturn(DebtListResponse.builder()
                .debts(java.util.List.of(debt)).summary(DebtListResponse.Summary.builder().build()).build());

        Object raw = executor.executeRead(user, "get_debts", Map.of(
                "fromDate", "2026-11-01", "toDate", "2026-11-30"));

        Map<?, ?> envelope = (Map<?, ?>) raw;
        Map<?, ?> data = (Map<?, ?>) envelope.get("data");
        assertEquals(1, data.get("calendarOccurrenceCount"));
        Map<?, ?> occurrence = (Map<?, ?>) ((java.util.List<?>) data.get("calendarOccurrences")).get(0);
        assertEquals("2026-11-05", occurrence.get("dueDate").toString());
        assertEquals("DEBT", occurrence.get("source"));
    }

    @Test
    void preparesAndExecutesCreateGoalThroughBusinessService() {
        UUID user = UUID.randomUUID();
        Map<String, Object> args = Map.of("name", "Mua xe", "goalType", "PURCHASE",
                "targetAmount", 30_000_000, "currencyCode", "VND", "targetDate", "2027-11-20");
        var prepared = executor.prepareWrite(user, "create_goal", args);
        assertEquals(false, prepared.preview().get("balanceImpact"));

        executor.executeWrite(user, "create_goal", args);
        verify(goals).createGoal(org.mockito.ArgumentMatchers.eq(user), any());
    }

    @Test
    void goalContributionPreviewShowsNoWalletImpactWithoutAccount() {
        UUID user = UUID.randomUUID();
        UUID goalId = UUID.randomUUID();
        when(goals.getGoalById(user, goalId)).thenReturn(com.finance.finance.modules.goal.dto.response.GoalResponse.builder()
                .id(goalId).name("Mua xe").currencyCode("VND")
                .status(GoalStatus.IN_PROGRESS)
                .currentAmount(new java.math.BigDecimal("1000000")).build());

        var prepared = executor.prepareWrite(user, "contribute_to_goal",
                Map.of("goalId", goalId.toString(), "amount", 500_000));

        assertEquals(false, prepared.preview().get("balanceImpact"));
        assertEquals(new java.math.BigDecimal("1500000"), prepared.preview().get("afterAmount"));
    }

    @Test
    void preparesDebtWithoutMutatingBalance() {
        UUID user = UUID.randomUUID();
        var prepared = executor.prepareWrite(user, "create_debt", Map.of(
                "debtType", "LENDING", "counterpartyName", "Minh", "principalAmount", 2_000_000,
                "currencyCode", "VND", "startDate", "2026-11-20"));
        assertEquals(false, prepared.preview().get("balanceImpact"));
        assertEquals("Minh", prepared.preview().get("entityName"));
    }

    @Test
    void debtInstallmentPreviewShowsFirstAndFinalPaymentDates() {
        UUID user = UUID.randomUUID();
        var prepared = executor.prepareWrite(user, "create_debt", Map.of(
                "debtType", "BORROWING", "counterpartyName", "Mua ô tô", "principalAmount", 6_000_000,
                "currencyCode", "VND", "paymentFrequency", "MONTHLY", "paymentAmount", 2_000_000,
                "startDate", "2026-11-20", "nextPaymentDate", "2026-12-05", "dueDate", "2027-02-05"));
        assertEquals(java.time.LocalDate.of(2026, 12, 5), prepared.preview().get("nextPaymentDate"));
        assertEquals(java.time.LocalDate.of(2027, 2, 5), prepared.preview().get("dueDate"));
    }

    @Test
    void rejectsDebtPrincipalPaymentAboveOwnedDebtRemaining() {
        UUID user = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(debts.getDebtById(user, debtId)).thenReturn(com.finance.finance.modules.debt.dto.response.DebtDetailResponse.builder()
                .id(debtId).debtType(DebtType.BORROWING).creditorName("Minh").currencyCode("VND")
                .status(DebtStatus.ACTIVE)
                .remainingAmount(new java.math.BigDecimal("400000")).build());
        assertThrows(BusinessException.class, () -> executor.prepareWrite(user, "record_debt_payment", Map.of(
                "debtId", debtId.toString(), "amount", 500_000, "paymentDate", "2026-11-20")));
    }

    @Test
    void budgetUpdateRequiresCurrentOwnedVersion() {
        UUID user = UUID.randomUUID();
        UUID budgetId = UUID.randomUUID();
        when(budgets.getBudgetById(user, budgetId)).thenReturn(com.finance.finance.modules.budget.dto.response.BudgetResponse.builder()
                .id(budgetId).name("Ăn uống").totalAmount(new java.math.BigDecimal("2000000"))
                .currencyCode("VND").alertThresholdPercentage(80).version(4).build());

        var prepared = executor.prepareWrite(user, "update_budget", Map.of(
                "budgetId", budgetId.toString(), "totalAmount", 3_000_000, "version", 4));
        assertEquals(new java.math.BigDecimal("2000000"), prepared.preview().get("beforeAmount"));
        assertEquals(new java.math.BigDecimal("3000000"), prepared.preview().get("afterAmount"));
        assertThrows(BusinessException.class, () -> executor.prepareWrite(user, "update_budget", Map.of(
                "budgetId", budgetId.toString(), "totalAmount", 3_000_000, "version", 3)));
    }

    @Test
    void preparesReminderScheduleWithoutImmediateBalanceImpact() {
        UUID user = UUID.randomUUID();
        var prepared = executor.prepareWrite(user, "create_schedule", Map.of(
                "scheduleType", "REMINDER", "name", "Tiền nhà", "recurrenceRule", "FREQ=MONTHLY;BYMONTHDAY=5",
                "startDate", "2026-12-05", "reminderMessage", "Đến hạn đóng tiền nhà"));
        assertEquals(false, prepared.preview().get("balanceImpact"));
        assertEquals("REMINDER", prepared.preview().get("scheduleType"));
        verify(recurrence).generateRecurrenceText("FREQ=MONTHLY;BYMONTHDAY=5");
    }

    @Test
    void scheduleUpdateRevalidatesOwnedScheduleAndEndDate() {
        UUID user = UUID.randomUUID();
        when(schedules.getScheduleById(12L, user)).thenReturn(
                com.finance.finance.modules.schedule.dto.response.ScheduleDetailResponse.builder()
                        .id(12L).name("Tiền nhà").startDate(java.time.LocalDate.of(2026, 12, 1)).build());
        var prepared = executor.prepareWrite(user, "update_schedule", Map.of(
                "scheduleId", 12, "endDate", "2027-12-01"));
        assertEquals(12L, prepared.preview().get("scheduleId"));
        assertThrows(BusinessException.class, () -> executor.prepareWrite(user, "update_schedule", Map.of(
                "scheduleId", 12, "endDate", "2026-11-01")));
    }

    @Test
    void accountPreviewExplainsInitialBalanceSemanticsAndDelegatesExecution() {
        UUID user = UUID.randomUUID();
        Map<String, Object> args = Map.of("name", "Tiền mặt test", "accountType", "CASH", "initialBalance", 500_000);
        var prepared = executor.prepareWrite(user, "create_account", args);
        assertEquals(true, prepared.preview().get("balanceImpact"));
        executor.executeWrite(user, "create_account", args);
        verify(accounts).createAccount(org.mockito.ArgumentMatchers.eq(user), any());
    }

    @Test
    void groupExpenseValidatesMembershipAndExactSplitBeforeProposal() {
        UUID user = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        when(groups.getGroupDetail(groupId, user)).thenReturn(
                com.finance.finance.modules.group.dto.response.GroupDetailResponse.builder().id(groupId).name("Nhóm test").build());
        when(groups.getMembers(groupId, user)).thenReturn(java.util.List.of(
                com.finance.finance.modules.group.dto.response.MemberResponse.builder().groupId(groupId).userId(user).build()));
        when(categoryRepository.findByIdAndUserIdOrSystem(categoryId, user)).thenReturn(java.util.Optional.of(
                com.finance.finance.modules.category.entity.Category.builder().id(categoryId).name("Khác")
                        .kind(com.finance.finance.common.enums.CategoryKind.EXPENSE).build()));
        when(groupFunds.getFund(groupId, user)).thenReturn(
                com.finance.finance.modules.group.dto.response.GroupFundResponse.builder()
                        .groupId(groupId).currency("VND").balance(new java.math.BigDecimal("5000")).build());
        Map<String, Object> args = new java.util.HashMap<>();
        args.put("groupId", groupId.toString()); args.put("description", "Chi test"); args.put("amount", 1000);
        args.put("paymentSource", "GROUP_FUND"); args.put("categoryId", categoryId.toString());
        args.put("splitMethod", "EXACT"); args.put("expenseDate", "2026-11-20");
        args.put("splits", java.util.List.of(Map.of("userId", user.toString(), "amount", 1000)));
        var prepared = executor.prepareWrite(user, "create_group_transaction", args);
        assertEquals("Nhóm test", prepared.preview().get("entityName"));
        assertEquals("GROUP_FUND", prepared.preview().get("paymentSource"));
        assertEquals("Khác", prepared.preview().get("categoryName"));
        assertEquals(true, prepared.preview().get("balanceImpact"));
    }

    @Test
    void groupFundContributionPreviewsAtomicWalletAndFundEffect() {
        UUID user = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        when(groups.getGroupDetail(groupId, user)).thenReturn(
                com.finance.finance.modules.group.dto.response.GroupDetailResponse.builder().id(groupId).name("Nhóm test").build());
        when(groupFunds.getFund(groupId, user)).thenReturn(
                com.finance.finance.modules.group.dto.response.GroupFundResponse.builder()
                        .groupId(groupId).currency("VND").balance(java.math.BigDecimal.ZERO).build());
        when(accountRepository.findByIdAndUserId(accountId, user)).thenReturn(java.util.Optional.of(
                com.finance.finance.modules.account.entity.Account.builder().id(accountId).name("Tiền mặt")
                        .currencyCode("VND").build()));
        var prepared = executor.prepareWrite(user, "contribute_group_fund", Map.of(
                "groupId", groupId.toString(), "sourceAccountId", accountId.toString(),
                "amount", 1000, "contributedAt", "2026-11-20"));
        assertEquals(true, prepared.preview().get("balanceImpact"));
        assertEquals("Tiền mặt", prepared.preview().get("accountName"));
    }
}
