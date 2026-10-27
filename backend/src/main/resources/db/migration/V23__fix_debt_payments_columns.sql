-- V23: Fix debt_payments table columns to match entity

-- Rename columns to match entity names
ALTER TABLE core.debt_payments RENAME COLUMN payment_amount TO amount;
ALTER TABLE core.debt_payments RENAME COLUMN principal_amount TO principal_paid;
ALTER TABLE core.debt_payments RENAME COLUMN interest_amount TO interest_paid;

-- Add account_id column (for tracking which account was used to make payment)
ALTER TABLE core.debt_payments ADD COLUMN account_id UUID;

-- Add payment_method column
ALTER TABLE core.debt_payments ADD COLUMN payment_method VARCHAR(50);

-- Add version column for optimistic locking
ALTER TABLE core.debt_payments ADD COLUMN version INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN core.debt_payments.amount IS 'Total payment amount (principal + interest)';
COMMENT ON COLUMN core.debt_payments.principal_paid IS 'Principal portion of the payment';
COMMENT ON COLUMN core.debt_payments.interest_paid IS 'Interest portion of the payment';
COMMENT ON COLUMN core.debt_payments.account_id IS 'Account used to make this payment';
COMMENT ON COLUMN core.debt_payments.payment_method IS 'Payment method (cash, transfer, etc.)';
