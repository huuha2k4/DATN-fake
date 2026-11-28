package com.finance.finance.modules.finai.tool;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.*;

@Component
public class FinAiToolRegistry {
    private final Map<String, FinAiToolDefinition> tools;

    public FinAiToolRegistry() {
        Map<String, FinAiToolDefinition> registry = new LinkedHashMap<>();
        registerReadRequired(registry, "get_categories", "Read selectable income or expense categories visible to this user.",
                Map.of("kind", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE"))), Set.of("kind"));
        registerRead(registry, "get_spending_profile", "Read the recorded spending profile and 50/30/20 ratios.", Map.of());
        registry.put("get_transactions", definition(
                "get_transactions", "List the authenticated user's transactions with bounded filters.", FinAiToolMode.READ,
                set("fromDate", "toDate", "accountId", "categoryId", "transactionType", "minAmount", "maxAmount", "search", "page", "pageSize"),
                Set.of(), objectSchema(Map.ofEntries(
                        Map.entry("fromDate", Map.of("type", "string", "format", "date")),
                        Map.entry("toDate", Map.of("type", "string", "format", "date")),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("categoryId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("transactionType", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE", "TRANSFER"))),
                        Map.entry("minAmount", Map.of("type", "number", "minimum", 0)),
                        Map.entry("maxAmount", Map.of("type", "number", "minimum", 0)),
                        Map.entry("search", Map.of("type", "string", "maxLength", 200)),
                        Map.entry("page", Map.of("type", "integer", "minimum", 1)),
                        Map.entry("pageSize", Map.of("type", "integer", "minimum", 1, "maximum", 50))
                ), List.of()), readOutputSchema()));
        registerRead(registry, "get_accounts", "List wallets/accounts and balances owned by the authenticated user.",
                Map.of("includeInactive", Map.of("type", "boolean"),
                        "accountType", Map.of("type", "string", "enum", List.of("CASH", "BANK_ACCOUNT", "E_WALLET", "DEBIT_CARD", "CREDIT_CARD", "INVESTMENT", "CRYPTO")),
                        "summaryOnly", Map.of("type", "boolean")));
        registerRead(registry, "get_financial_overview", "Aggregated income, expense, assets, budgets, goals and debts for a bounded period.",
                Map.of("fromDate", Map.of("type", "string", "format", "date"),
                        "toDate", Map.of("type", "string", "format", "date"),
                        "comparisonFromDate", Map.of("type", "string", "format", "date"),
                        "comparisonToDate", Map.of("type", "string", "format", "date"),
                        "accountId", Map.of("type", "string", "format", "uuid"),
                        "sections", Map.of("type", "array", "maxItems", 5, "uniqueItems", true,
                                "items", Map.of("type", "string", "enum", List.of("cashflow", "accounts", "budgets", "goals", "debts"))),
                        "groupBy", Map.of("type", "string", "enum", List.of("day", "week", "month", "year"))));
        registerRead(registry, "get_budgets", "Read the user's budgets, actual spending, remaining amounts and exceeded categories.",
                Map.of("status", Map.of("type", "string", "enum", List.of("ON_TRACK", "WARNING", "EXCEEDED", "COMPLETED")),
                        "periodType", Map.of("type", "string", "enum", List.of("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM")),
                        "year", Map.of("type", "integer", "minimum", 2000, "maximum", 2100),
                        "month", Map.of("type", "integer", "minimum", 1, "maximum", 12),
                        "summaryOnly", Map.of("type", "boolean")));
        registerRead(registry, "get_goals", "Read financial goals, accumulated amounts, deadlines and progress.",
                Map.of("status", Map.of("type", "string", "enum", List.of("IN_PROGRESS", "ACHIEVED", "CANCELLED", "FAILED")),
                        "summaryOnly", Map.of("type", "boolean")));
        registerRead(registry, "get_debts", "Read receivables/payables, balances, overdue state and aggregate debt statistics.",
                Map.of("debtType", Map.of("type", "string", "enum", List.of("BORROWING", "LENDING")),
                        "status", Map.of("type", "string", "enum", List.of("ACTIVE", "PAID_OFF", "OVERDUE", "CANCELLED")),
                        "fromDate", Map.of("type", "string", "format", "date"),
                        "toDate", Map.of("type", "string", "format", "date"),
                        "summaryOnly", Map.of("type", "boolean")));
        registerRead(registry, "get_schedules", "List bounded recurring financial schedules and reminders.",
                Map.of("status", Map.of("type", "string", "maxLength", 30),
                        "scheduleType", Map.of("type", "string", "maxLength", 30),
                        "fromDate", Map.of("type", "string", "format", "date"),
                        "toDate", Map.of("type", "string", "format", "date"),
                        "search", Map.of("type", "string", "maxLength", 200),
                        "page", Map.of("type", "integer", "minimum", 1),
                        "pageSize", Map.of("type", "integer", "minimum", 1, "maximum", 50)));
        registerRead(registry, "get_groups", "List financial groups accessible to the authenticated member.",
                Map.of("page", Map.of("type", "integer", "minimum", 1),
                        "pageSize", Map.of("type", "integer", "minimum", 1, "maximum", 50)));
        registerReadRequired(registry, "get_group_finances", "Read an accessible group's fund, contribution obligations, expenses, reimbursements, balances, settlements or child wallets.",
                Map.of("groupId", Map.of("type", "string", "format", "uuid"),
                        "section", Map.of("type", "string", "enum", List.of("overview", "members", "expenses", "balances", "fund", "contribution_periods", "reimbursements", "settlements", "child_wallets")),
                        "year", Map.of("type", "integer", "minimum", 2000, "maximum", 2100),
                        "month", Map.of("type", "integer", "minimum", 1, "maximum", 12),
                        "status", Map.of("type", "string", "maxLength", 30),
                        "page", Map.of("type", "integer", "minimum", 1),
                        "pageSize", Map.of("type", "integer", "minimum", 1, "maximum", 50)), Set.of("groupId", "section"));
        registry.put("create_transaction", definition(
                "create_transaction", "Propose creating an income, expense, or transfer. User confirmation is mandatory.", FinAiToolMode.WRITE,
                set("transactionType", "accountId", "toAccountId", "amount", "currencyCode", "description", "transactionDate", "transactionTime", "categoryId", "note", "transferFee"),
                set("transactionType", "accountId", "amount", "currencyCode", "transactionDate"),
                objectSchema(Map.ofEntries(
                        Map.entry("transactionType", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE", "TRANSFER"))),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("toAccountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("amount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("currencyCode", Map.of("type", "string", "enum", List.of("VND"))),
                        Map.entry("description", Map.of("type", "string", "maxLength", 500)),
                        Map.entry("transactionDate", Map.of("type", "string", "format", "date")),
                        Map.entry("transactionTime", Map.of("type", "string", "format", "time")),
                        Map.entry("categoryId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("note", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("transferFee", Map.of("type", "number", "minimum", 0))
                ), List.of("transactionType", "accountId", "amount", "currencyCode", "transactionDate")), Map.of("type", "object")));
        registry.put("create_budget", definition(
                "create_budget", "Propose a budget with one or more category limits. User confirmation is mandatory.", FinAiToolMode.WRITE,
                set("name", "periodType", "startDate", "endDate", "totalAmount", "currencyCode", "rolloverEnabled", "alertThresholdPercentage", "items"),
                set("name", "periodType", "startDate", "endDate", "totalAmount", "currencyCode", "items"),
                objectSchema(Map.of(
                        "name", Map.of("type", "string", "minLength", 1, "maxLength", 100),
                        "periodType", Map.of("type", "string", "enum", List.of("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM")),
                        "startDate", Map.of("type", "string", "format", "date"),
                        "endDate", Map.of("type", "string", "format", "date"),
                        "totalAmount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "currencyCode", Map.of("type", "string", "enum", List.of("VND")),
                        "rolloverEnabled", Map.of("type", "boolean"),
                        "alertThresholdPercentage", Map.of("type", "integer", "minimum", 0, "maximum", 100),
                        "items", Map.of("type", "array", "minItems", 1, "items", Map.of("type", "object", "required", List.of("categoryId", "amount"), "properties", Map.of("categoryId", Map.of("type", "string", "format", "uuid"), "amount", Map.of("type", "number", "exclusiveMinimum", 0), "alertThresholdPercentage", Map.of("type", "integer", "minimum", 0, "maximum", 100)), "additionalProperties", false))
                ), List.of("name", "periodType", "startDate", "endDate", "totalAmount", "currencyCode", "items")), Map.of("type", "object")));
        registry.put("create_goal", definition(
                "create_goal", "Propose creating a personal financial goal. Confirmation is mandatory.", FinAiToolMode.WRITE,
                set("name", "goalType", "targetAmount", "currencyCode", "targetDate", "priority", "description", "accountId"),
                set("name", "goalType", "targetAmount", "currencyCode"),
                objectSchema(Map.ofEntries(
                        Map.entry("name", Map.of("type", "string", "minLength", 1, "maxLength", 200)),
                        Map.entry("goalType", Map.of("type", "string", "enum", List.of("EMERGENCY_FUND", "PURCHASE", "VACATION", "EDUCATION", "RETIREMENT", "DEBT_PAYOFF", "INVESTMENT", "OTHER"))),
                        Map.entry("targetAmount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("currencyCode", Map.of("type", "string", "enum", List.of("VND"))),
                        Map.entry("targetDate", Map.of("type", "string", "format", "date")),
                        Map.entry("priority", Map.of("type", "string", "enum", List.of("LOW", "MEDIUM", "HIGH"))),
                        Map.entry("description", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid"))
                ), List.of("name", "goalType", "targetAmount", "currencyCode")), Map.of("type", "object")));
        registry.put("contribute_to_goal", definition(
                "contribute_to_goal", "Propose contributing to an owned goal, optionally from an owned account.", FinAiToolMode.WRITE,
                set("goalId", "amount", "note", "sourceAccountId"), set("goalId", "amount"),
                objectSchema(Map.of(
                        "goalId", Map.of("type", "string", "format", "uuid"),
                        "amount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "note", Map.of("type", "string", "maxLength", 500),
                        "sourceAccountId", Map.of("type", "string", "format", "uuid")
                ), List.of("goalId", "amount")), Map.of("type", "object")));
        registry.put("create_debt", definition(
                "create_debt", "Propose creating a borrowing or lending record without changing wallet balance.", FinAiToolMode.WRITE,
                set("debtType", "counterpartyName", "principalAmount", "currencyCode", "interestRate", "interestType",
                        "paymentFrequency", "paymentAmount", "nextPaymentDate", "startDate", "dueDate", "accountId",
                        "categoryId", "reminderEnabled", "reminderDaysBefore", "description", "note"),
                set("debtType", "counterpartyName", "principalAmount", "currencyCode", "startDate"),
                objectSchema(Map.ofEntries(
                        Map.entry("debtType", Map.of("type", "string", "enum", List.of("BORROWING", "LENDING"))),
                        Map.entry("counterpartyName", Map.of("type", "string", "minLength", 1, "maxLength", 255)),
                        Map.entry("principalAmount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("currencyCode", Map.of("type", "string", "enum", List.of("VND"))),
                        Map.entry("interestRate", Map.of("type", "number", "minimum", 0, "maximum", 100)),
                        Map.entry("interestType", Map.of("type", "string", "enum", List.of("FIXED", "VARIABLE", "NONE"))),
                        Map.entry("paymentFrequency", Map.of("type", "string", "enum", List.of("ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"))),
                        Map.entry("paymentAmount", Map.of("type", "number", "minimum", 0)),
                        Map.entry("nextPaymentDate", Map.of("type", "string", "format", "date")),
                        Map.entry("startDate", Map.of("type", "string", "format", "date")),
                        Map.entry("dueDate", Map.of("type", "string", "format", "date")),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("categoryId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("reminderEnabled", Map.of("type", "boolean")),
                        Map.entry("reminderDaysBefore", Map.of("type", "integer", "minimum", 0, "maximum", 365)),
                        Map.entry("description", Map.of("type", "string", "maxLength", 5000)),
                        Map.entry("note", Map.of("type", "string", "maxLength", 1000))
                ), List.of("debtType", "counterpartyName", "principalAmount", "currencyCode", "startDate")), Map.of("type", "object")));
        registry.put("record_debt_payment", definition(
                "record_debt_payment", "Propose recording payment/collection on an owned debt.", FinAiToolMode.WRITE,
                set("debtId", "amount", "principalPaid", "interestPaid", "paymentDate", "paymentMethod", "accountId", "note"),
                set("debtId", "amount", "paymentDate"),
                objectSchema(Map.ofEntries(
                        Map.entry("debtId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("amount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("principalPaid", Map.of("type", "number", "minimum", 0)),
                        Map.entry("interestPaid", Map.of("type", "number", "minimum", 0)),
                        Map.entry("paymentDate", Map.of("type", "string", "format", "date")),
                        Map.entry("paymentMethod", Map.of("type", "string", "maxLength", 50)),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("note", Map.of("type", "string", "maxLength", 1000))
                ), List.of("debtId", "amount", "paymentDate")), Map.of("type", "object")));
        registry.put("update_budget", definition(
                "update_budget", "Propose updating an owned budget using optimistic-lock version.", FinAiToolMode.WRITE,
                set("budgetId", "name", "totalAmount", "alertThresholdPercentage", "rolloverEnabled", "version"),
                set("budgetId", "version"),
                objectSchema(Map.of(
                        "budgetId", Map.of("type", "string", "format", "uuid"),
                        "name", Map.of("type", "string", "minLength", 1, "maxLength", 100),
                        "totalAmount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "alertThresholdPercentage", Map.of("type", "integer", "minimum", 0, "maximum", 100),
                        "rolloverEnabled", Map.of("type", "boolean"),
                        "version", Map.of("type", "integer", "minimum", 0)
                ), List.of("budgetId", "version")), Map.of("type", "object")));
        registry.put("create_schedule", definition(
                "create_schedule", "Propose creating a recurring transaction or reminder schedule.", FinAiToolMode.WRITE,
                set("scheduleType", "name", "recurrenceRule", "startDate", "endDate", "transactionType",
                        "accountId", "toAccountId", "amount", "currencyCode", "categoryId", "description", "note",
                        "reminderMessage", "autoExecute", "notificationEnabled", "notificationTimeBeforeMinutes", "notificationChannels"),
                set("scheduleType", "name", "recurrenceRule", "startDate"),
                objectSchema(Map.ofEntries(
                        Map.entry("scheduleType", Map.of("type", "string", "enum", List.of("TRANSACTION", "REMINDER"))),
                        Map.entry("name", Map.of("type", "string", "minLength", 1, "maxLength", 255)),
                        Map.entry("recurrenceRule", Map.of("type", "string", "minLength", 1, "maxLength", 500)),
                        Map.entry("startDate", Map.of("type", "string", "format", "date")),
                        Map.entry("endDate", Map.of("type", "string", "format", "date")),
                        Map.entry("transactionType", Map.of("type", "string", "enum", List.of("INCOME", "EXPENSE", "TRANSFER"))),
                        Map.entry("accountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("toAccountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("amount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("currencyCode", Map.of("type", "string", "enum", List.of("VND"))),
                        Map.entry("categoryId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("description", Map.of("type", "string", "maxLength", 500)),
                        Map.entry("note", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("reminderMessage", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("autoExecute", Map.of("type", "boolean")),
                        Map.entry("notificationEnabled", Map.of("type", "boolean")),
                        Map.entry("notificationTimeBeforeMinutes", Map.of("type", "integer", "minimum", 0, "maximum", 10080)),
                        Map.entry("notificationChannels", Map.of("type", "array", "uniqueItems", true,
                                "items", Map.of("type", "string", "enum", List.of("PUSH", "EMAIL", "SMS"))))
                ), List.of("scheduleType", "name", "recurrenceRule", "startDate")), Map.of("type", "object")));
        registry.put("update_schedule", definition(
                "update_schedule", "Propose safely updating an owned schedule's general settings.", FinAiToolMode.WRITE,
                set("scheduleId", "name", "recurrenceRule", "endDate", "reminderMessage", "autoExecute",
                        "notificationEnabled", "notificationTimeBeforeMinutes", "notificationChannels"),
                set("scheduleId"),
                objectSchema(Map.ofEntries(
                        Map.entry("scheduleId", Map.of("type", "integer", "minimum", 1)),
                        Map.entry("name", Map.of("type", "string", "minLength", 1, "maxLength", 255)),
                        Map.entry("recurrenceRule", Map.of("type", "string", "minLength", 1, "maxLength", 500)),
                        Map.entry("endDate", Map.of("type", "string", "format", "date")),
                        Map.entry("reminderMessage", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("autoExecute", Map.of("type", "boolean")),
                        Map.entry("notificationEnabled", Map.of("type", "boolean")),
                        Map.entry("notificationTimeBeforeMinutes", Map.of("type", "integer", "minimum", 0, "maximum", 10080)),
                        Map.entry("notificationChannels", Map.of("type", "array", "uniqueItems", true,
                                "items", Map.of("type", "string", "enum", List.of("PUSH", "EMAIL", "SMS"))))
                ), List.of("scheduleId")), Map.of("type", "object")));
        registry.put("create_account", definition(
                "create_account", "Propose creating a wallet/account with an explicit initial balance.", FinAiToolMode.WRITE,
                set("name", "accountType", "initialBalance", "bankId", "accountNumber", "phoneNumber",
                        "cardNumberLast4", "creditLimit", "billingCycleDay", "paymentDueDay", "icon", "color",
                        "description", "isIncludedInTotal"),
                set("name", "accountType", "initialBalance"),
                objectSchema(Map.ofEntries(
                        Map.entry("name", Map.of("type", "string", "minLength", 1, "maxLength", 100)),
                        Map.entry("accountType", Map.of("type", "string", "enum", List.of("CASH", "BANK_ACCOUNT", "E_WALLET", "DEBIT_CARD", "CREDIT_CARD", "INVESTMENT", "CRYPTO"))),
                        Map.entry("initialBalance", Map.of("type", "number")),
                        Map.entry("bankId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("accountNumber", Map.of("type", "string", "maxLength", 100)),
                        Map.entry("phoneNumber", Map.of("type", "string", "maxLength", 16)),
                        Map.entry("cardNumberLast4", Map.of("type", "string", "pattern", "^[0-9]{4}$")),
                        Map.entry("creditLimit", Map.of("type", "number", "minimum", 0)),
                        Map.entry("billingCycleDay", Map.of("type", "integer", "minimum", 1, "maximum", 31)),
                        Map.entry("paymentDueDay", Map.of("type", "integer", "minimum", 1, "maximum", 31)),
                        Map.entry("icon", Map.of("type", "string", "maxLength", 10)),
                        Map.entry("color", Map.of("type", "string", "pattern", "^#[0-9A-Fa-f]{6}$")),
                        Map.entry("description", Map.of("type", "string", "maxLength", 500)),
                        Map.entry("isIncludedInTotal", Map.of("type", "boolean"))
                ), List.of("name", "accountType", "initialBalance")), Map.of("type", "object")));
        registry.put("create_group_transaction", definition(
                "create_group_transaction", "Propose a group expense with an explicit funding source and financial purpose; confirmation is mandatory.", FinAiToolMode.WRITE,
                set("groupId", "description", "amount", "paymentSource", "sourceAccountId", "categoryId",
                        "financialPurpose", "splitMethod", "expenseDate", "notes", "splits"),
                set("groupId", "description", "amount", "paymentSource", "categoryId", "expenseDate"),
                objectSchema(Map.ofEntries(
                        Map.entry("groupId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("description", Map.of("type", "string", "minLength", 1, "maxLength", 300)),
                        Map.entry("amount", Map.of("type", "number", "exclusiveMinimum", 0)),
                        Map.entry("paymentSource", Map.of("type", "string", "enum", List.of("GROUP_FUND", "PERSONAL_ACCOUNT"))),
                        Map.entry("financialPurpose", Map.of("type", "string", "enum", List.of("MEMBER_SPLIT", "FUND_EXPENSE", "FUND_REIMBURSEMENT", "VOLUNTARY_SPEND"))),
                        Map.entry("sourceAccountId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("categoryId", Map.of("type", "string", "format", "uuid")),
                        Map.entry("splitMethod", Map.of("type", "string", "enum", List.of("EQUAL", "EXACT"))),
                        Map.entry("expenseDate", Map.of("type", "string", "format", "date")),
                        Map.entry("notes", Map.of("type", "string", "maxLength", 1000)),
                        Map.entry("splits", Map.of("type", "array", "minItems", 0, "maxItems", 100,
                                "items", Map.of("type", "object", "required", List.of("userId", "amount"),
                                        "properties", Map.of("userId", Map.of("type", "string", "format", "uuid"),
                                                "amount", Map.of("type", "number", "minimum", 0)), "additionalProperties", false)))
                ), List.of("groupId", "description", "amount", "paymentSource", "categoryId", "expenseDate")), Map.of("type", "object")));
        registry.put("contribute_group_fund", definition(
                "contribute_group_fund", "Propose moving money from an owned account into an accessible group fund.", FinAiToolMode.WRITE,
                set("groupId", "sourceAccountId", "amount", "contributedAt", "note", "periodId"),
                set("groupId", "sourceAccountId", "amount", "contributedAt"),
                objectSchema(Map.of(
                        "groupId", Map.of("type", "string", "format", "uuid"),
                        "sourceAccountId", Map.of("type", "string", "format", "uuid"),
                        "amount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "contributedAt", Map.of("type", "string", "format", "date"),
                        "periodId", Map.of("type", "string", "format", "uuid"),
                        "note", Map.of("type", "string", "maxLength", 1000)
                ), List.of("groupId", "sourceAccountId", "amount", "contributedAt")), Map.of("type", "object")));
        registry.put("create_child_spend", definition(
                "create_child_spend", "Propose recording a spending or earning transaction directly on a child wallet.", FinAiToolMode.WRITE,
                set("groupId", "walletId", "amount", "description", "categoryId", "notes"),
                set("groupId", "walletId", "amount", "description", "categoryId"),
                objectSchema(Map.of(
                        "groupId", Map.of("type", "string", "format", "uuid"),
                        "walletId", Map.of("type", "string", "format", "uuid"),
                        "amount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "description", Map.of("type", "string", "minLength", 1, "maxLength", 300),
                        "categoryId", Map.of("type", "string", "format", "uuid"),
                        "notes", Map.of("type", "string", "maxLength", 1000)
                ), List.of("groupId", "walletId", "amount", "description", "categoryId")), Map.of("type", "object")));
        registry.put("deposit_child_wallet", definition(
                "deposit_child_wallet", "Propose topping up / giving allowance to a child wallet from personal account or group fund.", FinAiToolMode.WRITE,
                set("groupId", "walletId", "amount", "source", "sourceAccountId", "description"),
                set("groupId", "walletId", "amount", "source"),
                objectSchema(Map.of(
                        "groupId", Map.of("type", "string", "format", "uuid"),
                        "walletId", Map.of("type", "string", "format", "uuid"),
                        "amount", Map.of("type", "number", "exclusiveMinimum", 0),
                        "source", Map.of("type", "string", "enum", List.of("PERSONAL_ACCOUNT", "GROUP_FUND", "allowance", "gift", "other")),
                        "sourceAccountId", Map.of("type", "string", "format", "uuid"),
                        "description", Map.of("type", "string", "maxLength", 300)
                ), List.of("groupId", "walletId", "amount", "source")), Map.of("type", "object")));
        this.tools = Collections.unmodifiableMap(registry);
    }

    private static Set<String> set(String... values) { return Set.of(values); }
    private static void registerRead(Map<String, FinAiToolDefinition> registry, String name, String description,
                                     Map<String, Object> properties) {
        registerReadRequired(registry, name, description, properties, Set.of());
    }
    private static void registerReadRequired(Map<String, FinAiToolDefinition> registry, String name, String description,
                                             Map<String, Object> properties, Set<String> required) {
        registry.put(name, definition(name, description, FinAiToolMode.READ, properties.keySet(), required,
                objectSchema(properties, List.copyOf(required)), readOutputSchema()));
    }
    private static Map<String, Object> readOutputSchema() {
        return Map.of("type", "object", "required", List.of("status", "tool", "data"),
                "properties", Map.of(
                        "status", Map.of("type", "string", "enum", List.of("SUCCESS")),
                        "tool", Map.of("type", "string"),
                        "data", Map.of()));
    }
    private static Map<String, Object> objectSchema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object"); schema.put("properties", properties); schema.put("required", required);
        schema.put("additionalProperties", false); return schema;
    }
    private static FinAiToolDefinition definition(String name, String description, FinAiToolMode mode,
            Set<String> allowed, Set<String> required, Map<String, Object> input, Map<String, Object> output) {
        return new FinAiToolDefinition(name, description, mode, allowed, required, input, output,
                "AUTHENTICATED_USER", Duration.ofSeconds(mode == FinAiToolMode.READ ? 8 : 15));
    }
    public Collection<FinAiToolDefinition> all() { return tools.values(); }
    public FinAiToolDefinition require(String name) {
        FinAiToolDefinition tool = tools.get(name);
        if (tool == null) throw new BusinessException("Tool is not registered", "FINAI_TOOL_NOT_ALLOWED", HttpStatus.BAD_REQUEST);
        return tool;
    }
    public FinAiToolDefinition validate(String name, Map<String, Object> arguments, FinAiToolMode expected) {
        FinAiToolDefinition tool = require(name);
        if (tool.mode() != expected) throw new BusinessException("Tool mode is not allowed for this operation", "FINAI_TOOL_MODE_INVALID", HttpStatus.BAD_REQUEST);
        Set<String> unknown = new HashSet<>(arguments.keySet()); unknown.removeAll(tool.allowedArguments());
        if (!unknown.isEmpty()) throw new BusinessException("Unknown tool arguments: " + unknown, "FINAI_SCHEMA_INVALID", HttpStatus.BAD_REQUEST);
        Set<String> missing = new HashSet<>(tool.requiredArguments());
        missing.removeIf(k -> arguments.containsKey(k) && arguments.get(k) != null);
        if (!missing.isEmpty()) throw new BusinessException("Missing tool arguments: " + missing, "FINAI_SCHEMA_INVALID", HttpStatus.BAD_REQUEST);
        return tool;
    }
}

