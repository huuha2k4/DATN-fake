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
        var categories = database.queryForList("select id from core.categories where kind = 'EXPENSE' and user_id is null order by id limit 2", UUID.class);
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
        assertThat(check.snapshot().get()).isEqualTo(check.expected());
        assertThat(actions.confirm(owner, pending.getActionId()).getStatus()).isEqualTo(FinAiActionStatus.COMPLETED);
        assertThat(check.snapshot().get()).isEqualTo(check.expected());
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
        UUID group = groups.createGroup(new CreateGroupRequest("Synthetic family", null, "FAMILY", "VND",
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
            boolean personal = tool.equals("group_personal_exact");
            var expense = new LinkedHashMap<String, Object>(Map.of("groupId", group, "description", "Dinner",
                    "amount", 50000, "paymentSource", personal ? "PERSONAL_ACCOUNT" : "GROUP_FUND",
                    "categoryId", category, "expenseDate", today.toString(), "splitMethod", personal ? "EXACT" : "EQUAL",
                    "splits", java.util.List.of(Map.of("userId", owner, "amount", personal ? 30000 : 25000),
                            Map.of("userId", member, "amount", personal ? 20000 : 25000))));
            if (personal) expense.put("sourceAccountId", account);
            return new Scenario("create_group_transaction", "splits", expense,
                    () -> row("select (select balance::int from core.group_funds where group_id = ?) as fund, "
                            + "(select balance::int from core.accounts where id = ?) as balance, "
                            + "count(s.id) as splits, coalesce(sum(s.amount) filter (where s.user_id = ?), 0)::int as share "
                            + "from core.group_expenses e join core.group_expense_splits s on s.expense_id = e.id where e.group_id = ?",
                            group, account, owner, group),
                    Map.of("fund", personal ? 100000 : 50000, "balance", personal ? 850000 : 900000,
                            "splits", 2L, "share", personal ? 30000 : 25000));
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
