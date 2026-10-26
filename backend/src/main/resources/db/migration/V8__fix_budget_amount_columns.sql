-- V5: Allow NULL for legacy amount/allocated_amount columns in budgets and budget_items
-- Since JPA entity uses total_amount in budgets and amount in budget_items
ALTER TABLE core.budgets ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE core.budget_items ALTER COLUMN allocated_amount DROP NOT NULL;
