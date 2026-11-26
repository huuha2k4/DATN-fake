-- V66: Convert PostgreSQL DOMAIN columns on active tables to standard SQL types
-- so Hibernate ddl-auto=validate passes natively (PostgreSQL JDBC reports DOMAINs as Types#DISTINCT).
-- Preserves all original DOMAIN CHECK constraints as explicit table CHECK constraints.

-- 1. core.accounts
ALTER TABLE core.accounts
    ALTER COLUMN credit_limit TYPE NUMERIC(19,4),
    ALTER COLUMN currency_code TYPE CHAR(3);
ALTER TABLE core.accounts ADD CONSTRAINT chk_accounts_credit_limit_nonneg CHECK (credit_limit IS NULL OR credit_limit >= 0);
ALTER TABLE core.accounts ADD CONSTRAINT chk_accounts_currency_code_iso CHECK (currency_code ~ '^[A-Z]{3}$');

-- 2. core.budget_items
ALTER TABLE core.budget_items
    ALTER COLUMN allocated_amount TYPE NUMERIC(19,4);
ALTER TABLE core.budget_items ADD CONSTRAINT chk_budget_items_allocated_pos CHECK (allocated_amount > 0);

-- 3. core.budgets
ALTER TABLE core.budgets
    ALTER COLUMN alert_threshold_pct TYPE NUMERIC(5,2),
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN currency_code TYPE CHAR(3);
ALTER TABLE core.budgets ADD CONSTRAINT chk_budgets_alert_threshold_pct CHECK (alert_threshold_pct IS NULL OR (alert_threshold_pct >= 0 AND alert_threshold_pct <= 100));
ALTER TABLE core.budgets ADD CONSTRAINT chk_budgets_amount_pos CHECK (amount > 0);
ALTER TABLE core.budgets ADD CONSTRAINT chk_budgets_currency_code_iso CHECK (currency_code ~ '^[A-Z]{3}$');

-- 4. core.categories
ALTER TABLE core.categories
    ALTER COLUMN default_budget_ratio TYPE NUMERIC(5,2);
ALTER TABLE core.categories ADD CONSTRAINT chk_categories_default_budget_ratio CHECK (default_budget_ratio IS NULL OR (default_budget_ratio >= 0 AND default_budget_ratio <= 100));

-- 5. core.debt_payments
ALTER TABLE core.debt_payments
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN interest_paid TYPE NUMERIC(19,4),
    ALTER COLUMN principal_paid TYPE NUMERIC(19,4);
ALTER TABLE core.debt_payments ADD CONSTRAINT chk_debt_payments_amount_pos CHECK (amount > 0);
ALTER TABLE core.debt_payments ADD CONSTRAINT chk_debt_payments_interest_nonneg CHECK (interest_paid IS NULL OR interest_paid >= 0);
ALTER TABLE core.debt_payments ADD CONSTRAINT chk_debt_payments_principal_nonneg CHECK (principal_paid IS NULL OR principal_paid >= 0);

-- 6. core.debts
ALTER TABLE core.debts
    ALTER COLUMN currency_code TYPE CHAR(3),
    ALTER COLUMN principal_amount TYPE NUMERIC(19,4),
    ALTER COLUMN remaining_amount TYPE NUMERIC(19,4);
ALTER TABLE core.debts ADD CONSTRAINT chk_debts_currency_code_iso CHECK (currency_code ~ '^[A-Z]{3}$');
ALTER TABLE core.debts ADD CONSTRAINT chk_debts_principal_pos CHECK (principal_amount > 0);
ALTER TABLE core.debts ADD CONSTRAINT chk_debts_remaining_nonneg CHECK (remaining_amount IS NULL OR remaining_amount >= 0);

-- 7. core.goals
ALTER TABLE core.goals
    ALTER COLUMN auto_save_amount TYPE NUMERIC(19,4),
    ALTER COLUMN currency_code TYPE CHAR(3),
    ALTER COLUMN current_amount TYPE NUMERIC(19,4),
    ALTER COLUMN target_amount TYPE NUMERIC(19,4);
ALTER TABLE core.goals ADD CONSTRAINT chk_goals_auto_save_nonneg CHECK (auto_save_amount IS NULL OR auto_save_amount >= 0);
ALTER TABLE core.goals ADD CONSTRAINT chk_goals_currency_code_iso CHECK (currency_code ~ '^[A-Z]{3}$');
ALTER TABLE core.goals ADD CONSTRAINT chk_goals_current_nonneg CHECK (current_amount >= 0);
ALTER TABLE core.goals ADD CONSTRAINT chk_goals_target_nonneg CHECK (target_amount >= 0);

-- 8. core.transactions
ALTER TABLE core.transactions
    ALTER COLUMN ai_confidence TYPE NUMERIC(5,4),
    ALTER COLUMN amount TYPE NUMERIC(19,4),
    ALTER COLUMN base_amount TYPE NUMERIC(19,4),
    ALTER COLUMN base_fee TYPE NUMERIC(19,4),
    ALTER COLUMN currency_code TYPE CHAR(3),
    ALTER COLUMN fee_amount TYPE NUMERIC(19,4),
    ALTER COLUMN to_amount TYPE NUMERIC(19,4);
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_ai_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1));
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_amount_pos CHECK (amount > 0);
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_base_amount_pos CHECK (base_amount > 0);
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_base_fee_nonneg CHECK (base_fee >= 0);
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_currency_code_iso CHECK (currency_code ~ '^[A-Z]{3}$');
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_fee_nonneg CHECK (fee_amount >= 0);
ALTER TABLE core.transactions ADD CONSTRAINT chk_transactions_to_amount_pos CHECK (to_amount IS NULL OR to_amount > 0);

-- 9. core.users
ALTER TABLE core.users
    ALTER COLUMN email TYPE VARCHAR(255),
    ALTER COLUMN preferred_currency TYPE CHAR(3);
ALTER TABLE core.users ADD CONSTRAINT chk_users_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');
ALTER TABLE core.users ADD CONSTRAINT chk_users_preferred_currency_iso CHECK (preferred_currency ~ '^[A-Z]{3}$');
