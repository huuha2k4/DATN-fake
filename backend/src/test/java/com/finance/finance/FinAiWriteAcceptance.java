package com.finance.finance;

import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.modules.budget.exception.BudgetNotFoundException;
import com.finance.finance.modules.debt.exception.DebtNotFoundException;
import com.finance.finance.modules.finai.dto.FinAiActionResponse;
import com.finance.finance.modules.finai.entity.FinAiActionStatus;
import com.finance.finance.modules.finai.service.FinAiActionService;
import com.finance.finance.modules.finai.tool.FinAiToolExecutor;
import com.finance.finance.modules.goal.exception.GoalNotFoundException;
import com.finance.finance.modules.group.dto.request.CreateChildWalletRequest;
import com.finance.finance.modules.group.dto.request.CreateGroupRequest;
import com.finance.finance.modules.group.service.ChildWalletService;
import com.finance.finance.modules.group.service.GroupService;
import com.finance.finance.modules.group.service.GroupFundService;
import com.finance.finance.modules.group.service.GroupExpenseService;
import com.finance.finance.modules.group.service.FundReimbursementService;
import com.finance.finance.modules.group.service.ContributionPeriodService;
import com.finance.finance.modules.group.service.GroupSettlementService;
import com.finance.finance.modules.group.service.GroupFinanceConfigService;
import com.finance.finance.modules.group.dto.request.ContributeGroupFundRequest;
import com.finance.finance.modules.group.dto.request.CreateContributionPeriodRequest;
import com.finance.finance.modules.group.dto.request.CreateExpenseRequest;
import com.finance.finance.modules.group.dto.request.ReimburseFundRequest;
import com.finance.finance.modules.group.dto.request.CreateSettlementRequest;
import com.finance.finance.modules.group.dto.request.ConfirmSettlementRequest;
import com.finance.finance.modules.group.dto.request.RejectSettlementRequest;
import com.finance.finance.modules.group.dto.request.UpdateGroupFinanceConfigRequest;
import com.finance.finance.modules.schedule.exception.ScheduleNotFoundException;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Shares the Spring/PostgreSQL fixture with the JWT chat integration tests. */
abstract class FinAiWriteAcceptance {
    @Autowired FinAiActionService actions;
    @Autowired FinAiToolExecutor tools;
    @Autowired UserRepository acceptanceUsers;
    @Autowired JdbcTemplate database;
    @Autowired GroupService groups;
    @Autowired ChildWalletService children;
    @Autowired GroupFundService groupFunds;
    @Autowired GroupExpenseService groupExpenses;
    @Autowired FundReimbursementService reimbursements;
    @Autowired ContributionPeriodService periods;
    @Autowired GroupSettlementService settlements;
    @Autowired GroupFinanceConfigService financeConfigs;
    @Autowired com.finance.finance.modules.transaction.service.TransactionService personalTransactions;

    private UUID owner;
    private UUID other;
    private UUID account;
    private UUID destination;
    private UUID category;
    private UUID secondCategory;
    private LocalDate today;

    void writeFixture() {
        owner = newUser();
        other = newUser();
        today = LocalDate.now();
        tools.executeWrite(owner, "create_account", account("Source"));
        tools.executeWrite(owner, "create_account", account("Destination"));
        account = database.queryForObject("select id from core.accounts where user_id = ? and name = 'Source'", UUID.class, owner);
        destination = database.queryForObject("select id from core.accounts where user_id = ? and name = 'Destination'", UUID.class, owner);
        var categories = database.queryForList("select id from core.categories where kind = 'EXPENSE' and is_system and deleted_at is null order by id limit 2", UUID.class);
        category = categories.get(0);
        secondCategory = categories.get(1);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"create_transaction", "transfer", "create_budget", "update_budget",
            "create_goal", "contribute_to_goal", "create_debt", "record_debt_payment", "collect_debt",
            "create_schedule", "update_schedule", "create_account", "create_group_transaction",
            "group_personal_exact", "contribute_group_fund", "create_child_spend", "deposit_child_wallet"})
    void writeProposalAndConfirmationMatrix(String scenario) {
        writeFixture();
        Scenario check = scenario(scenario);
        var missing = new LinkedHashMap<>(check.arguments());
        assertThat(missing.remove(check.required())).isNotNull();
        Object before = check.snapshot().get();
        assertThatThrownBy(() -> propose(check.tool(), missing)).isInstanceOf(BusinessException.class);
        for (String field : java.util.List.of("accountId", "sourceAccountId", "toAccountId", "categoryId",
                "groupId", "goalId", "debtId", "budgetId", "walletId", "scheduleId")) {
            if (!check.arguments().containsKey(field)) continue;
            var invalid = new LinkedHashMap<>(check.arguments());
            invalid.put(field, field.equals("scheduleId") ? Long.MAX_VALUE : UUID.randomUUID());
            assertThatThrownBy(() -> propose(check.tool(), invalid))
                    .as("invalid %s for %s", field, scenario)
                    .isInstanceOfAny(BusinessException.class, BudgetNotFoundException.class, DebtNotFoundException.class,
                            GoalNotFoundException.class, ScheduleNotFoundException.class, NoSuchElementException.class);
        }
        assertThat(pendingCount()).isZero();

        var cancelled = propose(check.tool(), check.arguments());
        assertThat(cancelled.getStatus()).isEqualTo(FinAiActionStatus.PENDING);
        assertThat(cancelled.getToolName()).isEqualTo(check.tool());
        assertThat(cancelled.getPreview()).isNotEmpty();
        assertThat(check.snapshot().get()).isEqualTo(before);
        assertThatThrownBy(() -> actions.confirm(other, cancelled.getActionId())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> actions.cancel(other, cancelled.getActionId())).isInstanceOf(BusinessException.class);
        assertThat(actions.cancel(owner, cancelled.getActionId()).getStatus()).isEqualTo(FinAiActionStatus.CANCELLED);
        assertThat(actions.confirm(owner, cancelled.getActionId()).getStatus()).isEqualTo(FinAiActionStatus.CANCELLED);
        assertThat(check.snapshot().get()).isEqualTo(before);

        var pending = propose(check.tool(), check.arguments());
        assertThat(pendingCount()).isEqualTo(1);
        assertThat(check.snapshot().get()).isEqualTo(before);
        var confirmed = actions.confirm(owner, pending.getActionId());
        assertThat(confirmed.getStatus()).as("confirm error %s", confirmed.getError()).isEqualTo(FinAiActionStatus.COMPLETED);
        Object committed = check.snapshot().get();
        if (scenario.equals("update_budget")) {
            var previous = (Map<?, ?>) before;
            var updated = (Map<?, ?>) committed;
            assertThat(updated.get("name")).isEqualTo("Updated budget");
            assertThat(((Number) updated.get("version")).longValue()).isGreaterThan(((Number) previous.get("version")).longValue());
        } else {
            assertThat(committed).isEqualTo(check.expected());
        }
        assertThat(actions.confirm(owner, pending.getActionId()).getStatus()).isEqualTo(FinAiActionStatus.COMPLETED);
        assertThat(check.snapshot().get()).isEqualTo(committed);
    }

    @Test
    void staleBudgetVersionFailsWithoutOverwritingCurrentBudget() {
        writeFixture();
        Scenario edit = scenario("update_budget");
        var pending = propose(edit.tool(), edit.arguments());
        var externalEdit = new LinkedHashMap<>(edit.arguments());
        externalEdit.put("name", "Newer budget");
        tools.executeWrite(owner, edit.tool(), externalEdit);
        Object current = edit.snapshot().get();
        assertThat(actions.confirm(owner, pending.getActionId()).getStatus()).isEqualTo(FinAiActionStatus.FAILED);
        assertThat(edit.snapshot().get()).isEqualTo(current);
    }

    @Test
    void concurrentConfirmDebitsTheGroupFundOnce() throws Exception {
        writeFixture();
        Scenario expense = scenario("create_group_transaction");
        UUID id = propose(expense.tool(), expense.arguments()).getActionId();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> actions.confirm(owner, id));
            var second = pool.submit(() -> actions.confirm(owner, id));
            assertThat(first.get(10, TimeUnit.SECONDS).getStatus()).isEqualTo(FinAiActionStatus.COMPLETED);
            assertThat(second.get(10, TimeUnit.SECONDS).getStatus()).isEqualTo(FinAiActionStatus.COMPLETED);
        }
        assertThat(expense.snapshot().get()).isEqualTo(expense.expected());
    }

    @Test
    void concurrentGroupContributionsAndReviewReconcileWalletAndFund() throws Exception {
        writeFixture();
        UUID group = financeGroup("FAMILY");
        race(() -> groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 30000, null), owner),
                () -> groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 45000, null), owner));
        var pending = groupFunds.submitExternalContribution(group, contribution("CASH", 25000, null), other, UUID.randomUUID().toString());
        assertThat(fundBalance(group)).isEqualTo(75000);
        race(() -> groupFunds.confirmContribution(group, pending.getId(), owner),
                () -> groupFunds.confirmContribution(group, pending.getId(), owner));
        assertThat(fundBalance(group)).isEqualTo(100000);
        assertThat(accountBalance(account)).isEqualTo(925000);
        assertThat(database.queryForObject("""
                select count(*) from core.group_fund_contributions c join core.group_funds f on f.id=c.fund_id
                where f.group_id=? and c.status='CONFIRMED'
                """, Long.class, group)).isEqualTo(3);
    }

    @Test
    void concurrentExpensesAndReimbursementsRespectAvailableFund() throws Exception {
        writeFixture();
        UUID group = financeGroup("FAMILY");
        groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 100000, null), owner);
        race(() -> tolerateStateConflict(() -> groupExpenses.createExpense(group, expense("FUND_EXPENSE", 60000), owner)),
                () -> tolerateStateConflict(() -> groupExpenses.createExpense(group, expense("FUND_EXPENSE", 60000), owner)));
        assertThat(fundBalance(group)).isEqualTo(40000);
        assertThat(groupExpenses.getBalances(group, owner).getSimplifiedDebts()).isEmpty();
        var source = groupExpenses.createExpense(group, expense("FUND_REIMBURSEMENT", 30000), owner);
        UUID obligation = database.queryForObject("select id from core.fund_reimbursements where expense_id=?", UUID.class, source.getId());
        String key = UUID.randomUUID().toString();
        race(() -> reimbursements.reimburse(group, obligation, reimbursement(20000), key, owner),
                () -> reimbursements.reimburse(group, obligation, reimbursement(20000), key, owner));
        assertThat(fundBalance(group)).isEqualTo(20000);
        assertThat(database.queryForObject("select count(*) from core.fund_reimbursement_payments where reimbursement_id=?", Long.class, obligation)).isEqualTo(1);
        race(() -> tolerateStateConflict(() -> groupExpenses.createExpense(group, expense("FUND_EXPENSE", 15000), owner)),
                () -> tolerateStateConflict(() -> reimbursements.reimburse(group, obligation, reimbursement(10000), UUID.randomUUID().toString(), owner)));
        assertThat(fundBalance(group)).isIn(5000, 10000);
        assertThat(accountBalance(account)).isEqualTo(870000);
        assertThat(database.queryForObject("""
                select (r.reimbursed_amount = (select sum(p.amount) from core.fund_reimbursement_payments p
                where p.reimbursement_id=r.id) and r.reimbursed_amount <= r.total_amount)
                from core.fund_reimbursements r where r.id=?
                """, Boolean.class, obligation)).isTrue();
    }

    @Test
    void concurrentPeriodCloseAndContributionNeverPostToClosedPeriod() throws Exception {
        writeFixture();
        UUID group = financeGroup("PROJECT");
        var template = new CreateContributionPeriodRequest();
        template.setName("Fixture period"); template.setStartDate(today); template.setDueDate(today.plusDays(2));
        template.setFrequency("ONCE"); template.setAllocationMethod("EXACT");
        var member = new CreateContributionPeriodRequest.MemberObligation();
        member.setUserId(owner); member.setAmount(BigDecimal.valueOf(100000));
        template.setMembers(java.util.List.of(member));
        UUID period = periods.create(group, template, owner).getId();
        race(() -> periods.close(group, period, owner),
                () -> tolerateStateConflict(() -> groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 20000, period), owner)));
        var result = periods.get(group, period, owner);
        assertThat(result.getStatus()).isEqualTo("CLOSED");
        assertThat(result.getConfirmedAmount().intValueExact()).isIn(0, 20000);
        assertThat(fundBalance(group)).isEqualTo(result.getConfirmedAmount().intValueExact());
        assertThat(accountBalance(account) + fundBalance(group)).isEqualTo(1000000);
    }

    @Test
    void twoDifferentSettlementRequestsCannotPayTheSameDebtTwice() throws Exception {
        writeFixture();
        UUID group = financeGroup("TRAVEL");
        tools.executeWrite(other, "create_account", account("Debtor"));
        UUID otherAccount = database.queryForObject("select id from core.accounts where user_id=? and name='Debtor'", UUID.class, other);
        var shared = expense("MEMBER_SPLIT", 800000);
        shared.setSplitMethod("EXACT");
        shared.setSplits(java.util.List.of(
                new CreateExpenseRequest.ExpenseSplitDto(owner, BigDecimal.valueOf(200000), null, null),
                new CreateExpenseRequest.ExpenseSplitDto(other, BigDecimal.valueOf(600000), null, null)));
        groupExpenses.createExpense(group, shared, owner);
        var request = new CreateSettlementRequest();
        request.setSourceAccountId(otherAccount); request.setToUserId(owner);
        request.setAmount(BigDecimal.valueOf(600000)); request.setSettlementDate(today);
        UUID first = settlements.createSettlement(group, request, other).getId();
        UUID second = settlements.createSettlement(group, request, other).getId();
        var confirm = new ConfirmSettlementRequest();
        confirm.setReceivingAccountId(destination);
        assertThat(accountBalance(otherAccount)).isEqualTo(1000000);
        race(() -> tolerateStateConflict(() -> settlements.confirmSettlement(group, first, confirm, owner)),
                () -> tolerateStateConflict(() -> settlements.confirmSettlement(group, second, confirm, owner)));
        assertThat(accountBalance(otherAccount)).isEqualTo(400000);
        assertThat(accountBalance(account)).isEqualTo(200000);
        assertThat(accountBalance(destination)).isEqualTo(1600000);
        assertThat(groupExpenses.getBalances(group, owner).getSimplifiedDebts()).isEmpty();
        assertThat(database.queryForObject("select count(*) from core.group_settlements where group_id=? and status='CONFIRMED'", Long.class, group)).isEqualTo(1);
    }

    @Test
    void finAiConfirmationAndDirectExpenseShareTheSameFundLock() throws Exception {
        writeFixture();
        UUID group = financeGroup("COUPLE");
        groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 100000, null), owner);
        UUID proposal = propose("create_group_transaction", Map.of(
                "groupId", group, "description", "Agent expense", "amount", 60000, "paymentSource", "GROUP_FUND",
                "categoryId", category, "expenseDate", today.toString())).getActionId();
        race(() -> actions.confirm(owner, proposal),
                () -> tolerateStateConflict(() -> groupExpenses.createExpense(group, expense("FUND_EXPENSE", 60000), owner)));
        assertThat(fundBalance(group)).isEqualTo(40000);
        assertThat(database.queryForObject("select count(*) from core.group_expenses where group_id=?", Long.class, group)).isEqualTo(1);
    }

    @Test
    void datasetARoommateFundSpendingPreservesContributionProgress() {
        writeFixture();
        UUID group = financeGroup("ROOMMATE");
        UUID third = addMember(group, false);
        UUID period = createExactPeriod(group, null, Map.of(owner, 1000000, other, 1000000, third, 1000000), java.util.Set.of());
        groupFunds.contribute(group, contribution("MANAGED_ACCOUNT", 1000000, period), owner);
        recordExternal(group, period, other, 400000);
        assertProgress(group, period, 3000000, 1400000, 1600000, 0, "46.67");
        groupExpenses.createExpense(group, expense("FUND_EXPENSE", 600000), owner);
        assertThat(fundBalance(group)).isEqualTo(800000);
        assertProgress(group, period, 3000000, 1400000, 1600000, 0, "46.67");
        assertThat(groupExpenses.getBalances(group, owner).getIsFullySettled()).isTrue();
        assertThat(accountBalance(account)).isZero();
    }

    @Test
    void datasetBFamilyChildrenAreExemptAndReimbursementDoesNotDuplicateCosts() {
        writeFixture();
        UUID group = financeGroup("FAMILY");
        UUID childOne = addMember(group, true), childTwo = addMember(group, true);
        UUID period = createExactPeriod(group, null, Map.of(owner, 8000000, other, 5000000, childOne, 0, childTwo, 0),
                java.util.Set.of(childOne, childTwo));
        recordExternal(group, period, owner, 8000000);
        recordExternal(group, period, other, 2000000);
        assertProgress(group, period, 13000000, 10000000, 3000000, 0, "76.92");
        assertThat(periods.get(group, period, owner).getMembers().stream().filter(row -> row.isExempt()).count()).isEqualTo(2);
        UUID otherWallet = wallet(other, "Beneficiary");
        var expense = expense("FUND_REIMBURSEMENT", 500000);
        expense.setSourceAccountId(otherWallet);
        var original = groupExpenses.createExpense(group, expense, other);
        UUID obligation = database.queryForObject("select id from core.fund_reimbursements where expense_id=?", UUID.class, original.getId());
        var payment = reimbursement(300000);
        payment.setUseAuthorizedWallet(true);
        assertThatThrownBy(() -> reimbursements.authorizeWallet(group, obligation, otherWallet, owner)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> reimbursements.reimburse(group, obligation, payment, "unauthorized", owner)).isInstanceOf(IllegalStateException.class);
        reimbursements.authorizeWallet(group, obligation, otherWallet, other);
        var result = reimbursements.reimburse(group, obligation, payment, "beneficiary-consent", owner);
        assertThat(result.getRemainingAmount()).isEqualByComparingTo("200000");
        assertThat(fundBalance(group)).isEqualTo(9700000);
        assertThat(accountBalance(otherWallet)).isEqualTo(800000);
        assertThat(groupExpenses.getBalances(group, owner).getTotalGroupExpenses()).isEqualByComparingTo("500000");
        assertThat(groupExpenses.getBalances(group, owner).getIsFullySettled()).isTrue();
        var summary = personalTransactions.getTransactionSummary(other, today, today, "day").getSummary();
        assertThat(summary.getTotalIncome()).isEqualByComparingTo("0");
        assertThat(summary.getTotalExpense()).isEqualByComparingTo("0");
        assertThat(summary.getWalletCashOut()).isEqualByComparingTo("500000");
        assertThat(summary.getWalletCashIn()).isEqualByComparingTo("300000");
    }

    @Test
    void datasetCTravelBalancesAndRecognizedSharesMatchAfterPartialSettlement() {
        writeFixture();
        UUID group = financeGroup("TRAVEL");
        UUID third = addMember(group, false), fourth = addMember(group, false);
        UUID otherWallet = wallet(other, "Travel B"), thirdWallet = wallet(third, "Travel C");
        addSplitExpense(group, owner, account, 800000, owner, other, third, fourth);
        var original = personalTransactions.getTransactionSummary(owner, today, today, "day").getSummary();
        assertThat(original.getTotalExpense()).isEqualByComparingTo("200000");
        assertThat(original.getWalletCashOut()).isEqualByComparingTo("800000");
        assertThat(netBalances(group)).containsExactlyInAnyOrderEntriesOf(
                Map.of(owner, 600000, other, -200000, third, -200000, fourth, -200000));
        addSplitExpense(group, other, otherWallet, 300000, owner, other, third);
        addSplitExpense(group, third, thirdWallet, 200000, third, fourth);
        assertThat(netBalances(group)).containsExactlyInAnyOrderEntriesOf(Map.of(owner, 500000, other, 0, third, -200000, fourth, -300000));
        var request = new CreateSettlementRequest();
        request.setSourceAccountId(thirdWallet); request.setToUserId(owner);
        request.setAmount(BigDecimal.valueOf(150000)); request.setSettlementDate(today);
        var pending = settlements.createSettlement(group, request, third);
        assertThat(accountBalance(thirdWallet)).isEqualTo(800000);
        var confirm = new ConfirmSettlementRequest();
        confirm.setReceivingAccountId(destination);
        settlements.confirmSettlement(group, pending.getId(), confirm, owner);
        assertThat(accountBalance(thirdWallet)).isEqualTo(650000);
        assertThat(accountBalance(destination)).isEqualTo(1150000);
        assertThat(netBalances(group)).containsExactlyInAnyOrderEntriesOf(Map.of(owner, 350000, other, 0, third, -50000, fourth, -300000));
        var receipt = personalTransactions.getTransactionSummary(owner, today, today, "day").getSummary();
        assertThat(receipt.getTotalIncome()).isEqualByComparingTo("0");
        assertThat(receipt.getTotalExpense()).isEqualByComparingTo("300000");
        assertThat(receipt.getWalletCashIn()).isEqualByComparingTo("150000");
        assertThat(personalTransactions.getTransactionSummary(third, today, today, "day").getSummary().getTotalExpense()).isEqualByComparingTo("400000");
    }

    @Test
    void fullTravelSettlementReconcilesWalletsAndReportsAfterSplitsAreDisabled() {
        writeFixture();
        UUID group = financeGroup("TRAVEL");
        UUID third = addMember(group, false), fourth = addMember(group, false);
        addSplitExpense(group, owner, account, 800000, owner, other, third, fourth);

        var config = new UpdateGroupFinanceConfigRequest();
        config.setUseSharedFund(true);
        config.setUseContributionPeriods(true);
        config.setAllowMemberSplits(false);
        config.setAllowDebtSimplification(false);
        config.setAllowFundReimbursements(true);
        financeConfigs.update(group, config, owner);
        assertThatThrownBy(() -> addSplitExpense(group, owner, account, 10000, owner, other))
                .isInstanceOf(IllegalStateException.class);

        var confirm = new ConfirmSettlementRequest();
        confirm.setReceivingAccountId(destination);
        for (UUID member : java.util.List.of(other, third, fourth)) {
            UUID source = wallet(member, "Travel settlement");
            var request = new CreateSettlementRequest();
            request.setSourceAccountId(source);
            request.setToUserId(owner);
            request.setAmount(BigDecimal.valueOf(200000));
            request.setSettlementDate(today);
            var rejected = settlements.createSettlement(group, request, member);
            var rejection = new RejectSettlementRequest();
            rejection.setReason("Sai thông tin");
            settlements.rejectSettlement(group, rejected.getId(), rejection, owner);
            assertThat(accountBalance(source)).isEqualTo(1000000);
            var pending = settlements.createSettlement(group, request, member);
            settlements.confirmSettlement(group, pending.getId(), confirm, owner);
            assertThat(accountBalance(source)).isEqualTo(800000);
            var memberReport = personalTransactions.getTransactionSummary(member, today, today, "day").getSummary();
            assertThat(memberReport.getTotalExpense()).isEqualByComparingTo("200000");
            assertThat(memberReport.getWalletCashOut()).isEqualByComparingTo("200000");
        }
        assertThat(groupExpenses.getBalances(group, owner).getIsFullySettled()).isTrue();
        assertThat(accountBalance(account)).isEqualTo(200000);
        assertThat(accountBalance(destination)).isEqualTo(1600000);
        var report = personalTransactions.getTransactionSummary(owner, today, today, "day").getSummary();
        assertThat(report.getTotalIncome()).isEqualByComparingTo("0");
        assertThat(report.getTotalExpense()).isEqualByComparingTo("200000");
        assertThat(report.getWalletCashIn()).isEqualByComparingTo("600000");
        assertThat(report.getWalletCashOut()).isEqualByComparingTo("800000");
    }

    @Test
    void datasetDProjectSeparatesTargetObligationsPendingAndFundBalance() {
        writeFixture();
        UUID group = financeGroup("PROJECT");
        UUID third = addMember(group, false);
        UUID period = createExactPeriod(group, 20000000, Map.of(owner, 4000000, other, 4000000, third, 0), java.util.Set.of(third));
        recordExternal(group, period, owner, 5000000);
        recordExternal(group, period, third, 1000000);
        var pending = groupFunds.submitExternalContribution(group, contribution("CASH", 2000000, period), other, "project-pending");
        var row = periods.get(group, period, owner);
        assertThat(row.getFundraisingProgressPercent()).isEqualByComparingTo("30");
        assertThat(row.getObligationProgressPercent()).isEqualByComparingTo("50");
        assertThat(row.getPendingAmount()).isEqualByComparingTo("2000000");
        assertThat(fundBalance(group)).isEqualTo(6000000);
        assertThatThrownBy(() -> periods.close(group, period, owner)).isInstanceOf(IllegalStateException.class);
        groupFunds.rejectContribution(group, pending.getId(), "Chưa nhận được tiền", owner);
        assertThat(periods.get(group, period, owner).getPendingAmount()).isEqualByComparingTo("0");
        assertThat(fundBalance(group)).isEqualTo(6000000);
    }

    @Test
    void datasetECoupleAllowsVoluntaryWalletSpendingWhenMemberSplitsAreOff() {
        writeFixture();
        UUID group = financeGroup("COUPLE");
        UUID period = createExactPeriod(group, null, Map.of(owner, 3000000, other, 2000000), java.util.Set.of());
        recordExternal(group, period, owner, 3000000);
        recordExternal(group, period, other, 2000000);
        groupExpenses.createExpense(group, expense("FUND_EXPENSE", 500000), owner);
        groupExpenses.createExpense(group, expense("VOLUNTARY_SPEND", 300000), owner);
        assertThat(fundBalance(group)).isEqualTo(4500000);
        assertThat(accountBalance(account)).isEqualTo(700000);
        assertThat(groupExpenses.getBalances(group, owner).getIsFullySettled()).isTrue();
        assertProgress(group, period, 5000000, 5000000, 0, 0, "100");
        assertThat(personalTransactions.getTransactionSummary(owner, today, today, "day").getSummary().getTotalExpense()).isEqualByComparingTo("300000");
    }

    @Test
    void datasetFOverpaymentDoesNotPayAnotherMembersObligation() {
        writeFixture();
        UUID group = financeGroup("ROOMMATE");
        UUID period = createExactPeriod(group, null, Map.of(owner, 1000000, other, 1000000), java.util.Set.of());
        recordExternal(group, period, owner, 1000000);
        recordExternal(group, period, owner, 500000);
        assertProgress(group, period, 2000000, 1500000, 1000000, 500000, "50");
        assertThat(periods.get(group, period, owner).getCompletedObligationAmount()).isEqualByComparingTo("1000000");
        recordExternal(group, null, other, 100000);
        assertProgress(group, period, 2000000, 1500000, 1000000, 500000, "50");
        assertThat(fundBalance(group)).isEqualTo(1600000);
    }

    @Test
    void monthlyRolloverPreservesMonthEndAndRunsOnceAcrossWorkers() throws Exception {
        writeFixture();
        UUID group = financeGroup("FAMILY");
        var start = LocalDate.of(2028, 1, 31);
        var request = new CreateContributionPeriodRequest();
        request.setName("Month end"); request.setStartDate(start); request.setDueDate(start);
        request.setFrequency("MONTHLY"); request.setAllocationMethod("EXACT");
        var member = new CreateContributionPeriodRequest.MemberObligation();
        member.setUserId(owner); member.setAmount(BigDecimal.valueOf(100000));
        request.setMembers(java.util.List.of(member));
        UUID january = periods.create(group, request, owner).getId();
        var februaryEnd = LocalDate.of(2028, 2, 29);
        race(() -> periods.rollOver(group, january, februaryEnd), () -> periods.rollOver(group, january, februaryEnd));
        var february = periods.getActive(group, owner);
        assertThat(february.getDueDate()).isEqualTo(februaryEnd);
        var marchEnd = LocalDate.of(2028, 3, 31);
        periods.rollOver(group, february.getId(), marchEnd);
        var march = periods.getActive(group, owner);
        assertThat(march.getDueDate()).isEqualTo(marchEnd);
        assertThat(march.getRequiredTotal()).isEqualByComparingTo("100000");
        assertThat(march.getConfirmedAmount()).isEqualByComparingTo("0");
        assertThat(periods.get(group, january, owner).getStatus()).isEqualTo("CLOSED");
        assertThat(database.queryForObject("select count(*) from core.contribution_periods where group_id=?", Long.class, group)).isEqualTo(3);
    }

    @Test
    void obligationAdjustmentAndReminderRespectScopeAndConfirmedPayments() {
        writeFixture();
        UUID group = financeGroup("ROOMMATE");
        UUID period = createExactPeriod(group, null, Map.of(owner, 100000, other, 100000), java.util.Set.of());
        recordExternal(group, period, owner, 100000);
        periods.remind(group, period, owner);
        periods.remind(group, period, owner);
        assertThat(database.queryForObject("select count(*) from core.notifications where user_id=? and action_url like ?",
                Long.class, other, "%periodId=" + period + "&event=manual-%")).isEqualTo(1);
        assertThat(database.queryForObject("select count(*) from core.notifications where user_id=? and action_url like ?",
                Long.class, owner, "%periodId=" + period + "&event=manual-%")).isZero();
        var edit = new com.finance.finance.modules.group.dto.request.AdjustContributionObligationRequest(
                BigDecimal.ZERO, true, "Miễn đóng theo thỏa thuận");
        assertThatThrownBy(() -> periods.adjust(group, period, other, edit, other)).isInstanceOf(SecurityException.class);
        periods.adjust(group, period, other, edit, owner);
        assertProgress(group, period, 100000, 100000, 0, 0, "100");
        groups.leaveGroup(group, other);
        assertThat(fundBalance(group)).isEqualTo(100000);
    }

    private UUID addMember(UUID group, boolean child) {
        UUID id = newUser();
        database.update("insert into core.group_members(group_id,user_id,is_child_profile) values (?,?,?)", group, id, child);
        return id;
    }

    private UUID wallet(UUID user, String name) {
        tools.executeWrite(user, "create_account", account(name));
        return database.queryForObject("select id from core.accounts where user_id=? and name=?", UUID.class, user, name);
    }

    private UUID createExactPeriod(UUID group, Integer target, Map<UUID, Integer> amounts, java.util.Set<UUID> exempt) {
        var request = new CreateContributionPeriodRequest();
        request.setName("Acceptance period"); request.setStartDate(today.minusDays(1)); request.setDueDate(today.plusDays(10));
        request.setFrequency("ONCE"); request.setAllocationMethod("EXACT");
        if (target != null) request.setFundraisingTarget(BigDecimal.valueOf(target));
        request.setMembers(amounts.entrySet().stream().map(entry -> {
            var row = new CreateContributionPeriodRequest.MemberObligation();
            row.setUserId(entry.getKey()); row.setAmount(BigDecimal.valueOf(entry.getValue()));
            row.setExempt(exempt.contains(entry.getKey()));
            return row;
        }).toList());
        return periods.create(group, request, owner).getId();
    }

    private void recordExternal(UUID group, UUID period, UUID actor, int amount) {
        var pending = groupFunds.submitExternalContribution(group, contribution("CASH", amount, period), actor, UUID.randomUUID().toString());
        groupFunds.confirmContribution(group, pending.getId(), owner);
    }

    private void assertProgress(UUID group, UUID period, int required, int paid, int missing, int excess, String percent) {
        var result = periods.get(group, period, owner);
        assertThat(result.getRequiredTotal().intValueExact()).isEqualTo(required);
        assertThat(result.getConfirmedAmount().intValueExact()).isEqualTo(paid);
        assertThat(result.getOutstandingAmount().intValueExact()).isEqualTo(missing);
        assertThat(result.getExcessAmount().intValueExact()).isEqualTo(excess);
        assertThat(result.getObligationProgressPercent()).isEqualByComparingTo(percent);
    }

    private void addSplitExpense(UUID group, UUID payer, UUID wallet, int amount, UUID... members) {
        var expense = expense("MEMBER_SPLIT", amount);
        expense.setPaidByUserId(payer); expense.setSourceAccountId(wallet);
        expense.setSplitMethod("EQUAL");
        expense.setSplits(java.util.Arrays.stream(members).map(member ->
                new CreateExpenseRequest.ExpenseSplitDto(member, BigDecimal.ZERO, null, null)).toList());
        groupExpenses.createExpense(group, expense, payer);
    }

    private Map<UUID, Integer> netBalances(UUID group) {
        return groupExpenses.getBalances(group, owner).getBalances().stream().collect(java.util.stream.Collectors
                .toMap(row -> row.getUserId(), row -> row.getBalance().intValueExact()));
    }

    private UUID financeGroup(String type) {
        UUID group = groups.createGroup(new CreateGroupRequest("Finance fixture", null, type, "VND", null, null), owner).getId();
        database.update("insert into core.group_members (group_id,user_id) values (?,?)", group, other);
        return group;
    }

    private ContributeGroupFundRequest contribution(String source, int amount, UUID period) {
        var request = new ContributeGroupFundRequest();
        request.setSourceType(source); request.setPeriodId(period);
        request.setAmount(BigDecimal.valueOf(amount)); request.setContributedAt(today);
        if ("MANAGED_ACCOUNT".equals(source)) request.setSourceAccountId(account);
        return request;
    }

    private CreateExpenseRequest expense(String purpose, int amount) {
        var request = new CreateExpenseRequest();
        request.setDescription("Finance expense"); request.setAmount(BigDecimal.valueOf(amount));
        request.setCategoryId(category); request.setExpenseDate(today); request.setPaidByUserId(owner);
        request.setFinancialPurpose(purpose);
        request.setPaymentSource("FUND_EXPENSE".equals(purpose) ? "GROUP_FUND" : "PERSONAL_ACCOUNT");
        if (!"FUND_EXPENSE".equals(purpose)) request.setSourceAccountId(account);
        return request;
    }

    private ReimburseFundRequest reimbursement(int amount) {
        var request = new ReimburseFundRequest();
        request.setAmount(BigDecimal.valueOf(amount));
        return request;
    }

    private int fundBalance(UUID group) {
        return database.queryForObject("select balance::int from core.group_funds where group_id=?", Integer.class, group);
    }

    private int accountBalance(UUID id) {
        return database.queryForObject("select balance::int from core.accounts where id=?", Integer.class, id);
    }

    private void race(Runnable first, Runnable second) throws Exception {
        var start = new java.util.concurrent.CyclicBarrier(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var futures = java.util.List.of(first, second).stream().map(task -> pool.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                task.run();
                return null;
            })).toList();
            for (var future : futures) future.get(15, TimeUnit.SECONDS);
        }
    }

    private void tolerateStateConflict(Runnable operation) {
        try { operation.run(); }
        catch (IllegalStateException expected) { /* The other transaction won. Final state is asserted. */ }
    }

    private Scenario scenario(String tool) {
        return switch (tool) {
            case "create_transaction" -> new Scenario(tool, "amount",
                    Map.of("transactionType", "EXPENSE", "amount", 50000, "accountId", account,
                            "categoryId", category, "currencyCode", "VND", "transactionDate", today.toString()),
                    () -> row("select (select count(*) from core.transactions where user_id = ?) as entries, "
                            + "balance::int as balance from core.accounts where id = ?", owner, account),
                    Map.of("entries", 1L, "balance", 950000));
            case "transfer" -> new Scenario("create_transaction", "toAccountId",
                    Map.of("transactionType", "TRANSFER", "amount", 50000, "accountId", account,
                            "toAccountId", destination, "currencyCode", "VND", "transactionDate", today.toString()),
                    () -> row("select a.balance::int as source, b.balance::int as destination "
                            + "from core.accounts a, core.accounts b where a.id = ? and b.id = ?", account, destination),
                    Map.of("source", 950000, "destination", 1050000));
            case "create_budget" -> new Scenario(tool, "items", budget(),
                    () -> row("select count(*) as items, coalesce(sum(i.amount), 0)::int as total "
                            + "from core.budget_items i join core.budgets b on b.id = i.budget_id where b.user_id = ?", owner),
                    Map.of("items", 2L, "total", 200000));
            case "update_budget" -> {
                tools.executeWrite(owner, "create_budget", budget());
                UUID id = database.queryForObject("select id from core.budgets where user_id = ?", UUID.class, owner);
                int version = database.queryForObject("select version from core.budgets where id = ?", Integer.class, id);
                yield new Scenario(tool, "version", Map.of("budgetId", id, "version", version, "name", "Updated budget"),
                        () -> row("select name, version from core.budgets where id = ?", id),
                        Map.of("name", "Updated budget", "version", (long) version + 1));
            }
            case "create_goal" -> new Scenario(tool, "targetAmount", goal(),
                    () -> row("select count(*) as entries, coalesce(sum(target_amount), 0)::int as amount "
                            + "from core.goals where user_id = ?", owner), Map.of("entries", 1L, "amount", 100000));
            case "contribute_to_goal" -> {
                tools.executeWrite(owner, "create_goal", goal());
                UUID id = database.queryForObject("select id from core.goals where user_id = ?", UUID.class, owner);
                yield new Scenario(tool, "amount", Map.of("goalId", id, "amount", 10000, "sourceAccountId", account),
                        () -> row("select current_amount::int as saved, (select balance::int from core.accounts where id = ?) "
                                + "as balance from core.goals where id = ?", account, id),
                        Map.of("saved", 10000, "balance", 990000));
            }
            case "create_debt" -> new Scenario(tool, "principalAmount", debt("BORROWING"),
                    () -> row("select count(*) as entries, coalesce(sum(principal_amount), 0)::int as amount "
                            + "from core.debts where user_id = ?", owner), Map.of("entries", 1L, "amount", 100000));
            case "record_debt_payment", "collect_debt" -> {
                boolean collecting = tool.equals("collect_debt");
                tools.executeWrite(owner, "create_debt", debt(collecting ? "LENDING" : "BORROWING"));
                UUID id = database.queryForObject("select id from core.debts where user_id = ?", UUID.class, owner);
                yield new Scenario("record_debt_payment", "amount", Map.of("debtId", id, "amount", 10000,
                        "principalPaid", 10000, "interestPaid", 0, "paymentDate", today.toString(), "accountId", account),
                        () -> row("select count(*) as entries, coalesce(sum(amount), 0)::int as amount, "
                                + "(select balance::int from core.accounts where id = ?) as balance "
                                + "from core.debt_payments where debt_id = ?", account, id),
                        Map.of("entries", 1L, "amount", 10000, "balance", collecting ? 1010000 : 990000));
            }
            case "create_schedule" -> new Scenario(tool, "recurrenceRule", schedule(),
                    () -> row("select count(*) as entries, max(recurrence_rule) as rule from core.schedules where user_id = ?", owner),
                    Map.of("entries", 1L, "rule", schedule().get("recurrenceRule")));
            case "update_schedule" -> {
                tools.executeWrite(owner, "create_schedule", schedule());
                Long id = database.queryForObject("select id from core.schedules where user_id = ?", Long.class, owner);
                yield new Scenario(tool, "scheduleId", Map.of("scheduleId", id, "name", "Updated schedule",
                        "recurrenceRule", "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4"),
                        () -> row("select name, recurrence_rule from core.schedules where id = ?", id),
                        Map.of("name", "Updated schedule", "recurrence_rule", "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4"));
            }
            case "create_account" -> new Scenario(tool, "accountType", account("New account"),
                    () -> row("select count(*) as entries, coalesce(sum(balance), 0)::int as amount "
                            + "from core.accounts where user_id = ? and name = 'New account'", owner),
                    Map.of("entries", 1L, "amount", 1000000));
            default -> groupScenario(tool);
        };
    }

    private Scenario groupScenario(String tool) {
        boolean personalGroupExpense = tool.equals("group_personal_exact");
        UUID group = groups.createGroup(new CreateGroupRequest("Synthetic group", null,
                personalGroupExpense ? "ROOMMATE" : "FAMILY", "VND",
                null, null), owner).getId();
        UUID member = newUser();
        database.update("insert into core.group_members (group_id, user_id) values (?, ?)", group, member);
        var contribution = Map.<String, Object>of("groupId", group, "sourceAccountId", account,
                "amount", 100000, "contributedAt", today.toString());
        if (tool.equals("contribute_group_fund")) {
            return new Scenario(tool, "sourceAccountId", contribution,
                    () -> row("select (select count(*) from core.group_fund_contributions where fund_id = f.id) as entries, "
                            + "f.balance::int as fund, (select balance::int from core.accounts where id = ?) as balance "
                            + "from core.group_funds f where f.group_id = ?", account, group),
                    Map.of("entries", 1L, "balance", 900000, "fund", 100000));
        }
        tools.executeWrite(owner, "contribute_group_fund", contribution);
        if (tool.equals("create_group_transaction") || tool.equals("group_personal_exact")) {
            boolean personal = personalGroupExpense;
            var expense = new LinkedHashMap<String, Object>(Map.of("groupId", group, "description", "Dinner",
                    "amount", 50000, "paymentSource", personal ? "PERSONAL_ACCOUNT" : "GROUP_FUND",
                    "financialPurpose", personal ? "MEMBER_SPLIT" : "FUND_EXPENSE",
                    "categoryId", category, "expenseDate", today.toString(), "splitMethod", personal ? "EXACT" : "EQUAL",
                    "splits", java.util.List.of(Map.of("userId", owner, "amount", personal ? 30000 : 25000),
                            Map.of("userId", member, "amount", personal ? 20000 : 25000))));
            if (personal) expense.put("sourceAccountId", account);
            return new Scenario("create_group_transaction", personal ? "splits" : "amount", expense,
                    () -> row("select (select balance::int from core.group_funds where group_id = ?) as fund, "
                            + "(select balance::int from core.accounts where id = ?) as balance, "
                            + "count(s.id) as splits, coalesce(sum(s.amount) filter (where s.user_id = ?), 0)::int as share "
                            + "from core.group_expenses e join core.group_expense_splits s on s.expense_id = e.id where e.group_id = ?",
                            group, account, owner, group),
                    Map.of("fund", personal ? 100000 : 50000, "balance", personal ? 850000 : 900000,
                            "splits", personal ? 2L : 0L, "share", personal ? 30000 : 0));
        }
        var request = new CreateChildWalletRequest();
        request.setChildName("Synthetic child");
        request.setDateOfBirth(today.minusYears(10));
        request.setBalance(BigDecimal.valueOf(100000));
        UUID wallet = children.createWallet(group, request, owner).getId();
        boolean spending = tool.equals("create_child_spend");
        Map<String, Object> args = spending
                ? Map.of("groupId", group, "walletId", wallet, "description", "Books", "amount", 10000, "categoryId", category)
                : Map.of("groupId", group, "walletId", wallet, "description", "Allowance", "amount", 10000, "source", "GROUP_FUND");
        return new Scenario(tool, "amount", args,
                () -> row("select w.balance::int as wallet, f.balance::int as fund from core.child_wallets w "
                        + "join core.group_funds f on f.group_id = w.group_id where w.id = ?", wallet),
                Map.of("wallet", spending ? 90000 : 110000, "fund", spending ? 100000 : 90000));
    }

    private Map<String, Object> row(String query, Object... values) {
        return database.queryForMap(query, values);
    }

    private UUID newUser() {
        return acceptanceUsers.saveAndFlush(User.builder().email(UUID.randomUUID() + "@example.test").build()).getId();
    }

    private FinAiActionResponse propose(String tool, Map<String, Object> args) {
        return actions.createPending(owner, null, null, tool, args);
    }

    private long pendingCount() {
        return database.queryForObject("select count(*) from core.finai_pending_actions where user_id = ? and status = 'PENDING'",
                Long.class, owner);
    }

    private Map<String, Object> account(String name) {
        return Map.of("name", name, "accountType", "CASH", "initialBalance", 1000000);
    }

    private Map<String, Object> budget() {
        LocalDate start = today.plusMonths(1).withDayOfMonth(1);
        return Map.of("name", "Two categories", "periodType", "MONTHLY", "startDate", start.toString(),
                "endDate", start.plusMonths(1).minusDays(1).toString(), "totalAmount", 200000, "currencyCode", "VND",
                "items", java.util.List.of(Map.of("categoryId", category, "amount", 80000),
                        Map.of("categoryId", secondCategory, "amount", 120000)));
    }

    private Map<String, Object> goal() {
        return Map.of("name", "Synthetic goal", "goalType", "EDUCATION", "targetAmount", 100000, "currencyCode", "VND");
    }

    private Map<String, Object> debt(String direction) {
        return Map.of("debtType", direction, "counterpartyName", "Synthetic person", "principalAmount", 100000,
                "currencyCode", "VND", "startDate", today.minusDays(1).toString());
    }

    private Map<String, Object> schedule() {
        return Map.of("scheduleType", "TRANSACTION", "name", "Monthly recurring transfer",
                "recurrenceRule", "FREQ=MONTHLY;BYMONTHDAY=5,20;COUNT=6", "startDate", today.plusDays(1).toString(),
                "transactionType", "TRANSFER", "accountId", account, "toAccountId", destination, "amount", 1000,
                "currencyCode", "VND");
    }

    private record Scenario(String tool, String required, Map<String, Object> arguments,
                            Supplier<Object> snapshot, Object expected) {}
}
