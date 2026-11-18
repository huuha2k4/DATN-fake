-- =====================================================
-- V57: Remove Multi-Currency Support (Vietnam-only)
-- Chỉ hỗ trợ VND cho thị trường Việt Nam
-- =====================================================

-- 1. Update tất cả currency về VND (chỉ các table thực sự tồn tại)
UPDATE core.users SET preferred_currency = 'VND' WHERE preferred_currency IS NULL OR preferred_currency != 'VND';
UPDATE core.groups SET base_currency = 'VND' WHERE base_currency IS NULL OR base_currency != 'VND';
UPDATE core.group_funds SET currency = 'VND' WHERE currency IS NULL OR currency != 'VND';
UPDATE core.group_expenses SET currency = 'VND' WHERE currency IS NULL OR currency != 'VND';
UPDATE core.group_settlements SET currency = 'VND' WHERE currency IS NULL OR currency != 'VND';
UPDATE core.accounts SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
UPDATE core.receipts SET currency = 'VND' WHERE currency IS NULL OR currency != 'VND';
UPDATE core.budgets SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
UPDATE core.goals SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
UPDATE core.debts SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
UPDATE core.child_wallets SET currency = 'VND' WHERE currency IS NULL OR currency != 'VND';

-- Update schedules if exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'schedules') THEN
        UPDATE core.schedules SET template_currency_code = 'VND' WHERE template_currency_code IS NULL OR template_currency_code != 'VND';
    END IF;
END $$;

-- Update monthly_summaries if exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'monthly_summaries') THEN
        UPDATE core.monthly_summaries SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
    END IF;
END $$;

-- Update assets if exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'assets') THEN
        UPDATE core.assets SET currency_code = 'VND' WHERE currency_code IS NULL OR currency_code != 'VND';
    END IF;
END $$;

-- 2. Drop tất cả foreign key constraints tham chiếu đến currencies
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_preferred_currency_fkey;
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_base_currency_fkey;
ALTER TABLE core.groups DROP CONSTRAINT IF EXISTS groups_base_currency_fkey;
ALTER TABLE core.group_funds DROP CONSTRAINT IF EXISTS group_funds_currency_fkey;
ALTER TABLE core.group_expenses DROP CONSTRAINT IF EXISTS group_expenses_currency_code_fkey;
ALTER TABLE core.group_settlements DROP CONSTRAINT IF EXISTS group_settlements_currency_code_fkey;
ALTER TABLE core.accounts DROP CONSTRAINT IF EXISTS accounts_currency_code_fkey;
ALTER TABLE core.receipts DROP CONSTRAINT IF EXISTS receipts_currency_fkey;
ALTER TABLE core.budgets DROP CONSTRAINT IF EXISTS budgets_currency_code_fkey;
ALTER TABLE core.goals DROP CONSTRAINT IF EXISTS goals_currency_code_fkey;
ALTER TABLE core.debts DROP CONSTRAINT IF EXISTS debts_currency_code_fkey;

-- Drop constraints from optional tables
ALTER TABLE core.schedules DROP CONSTRAINT IF EXISTS schedules_template_currency_code_fkey;
ALTER TABLE core.monthly_summaries DROP CONSTRAINT IF EXISTS monthly_summaries_currency_code_fkey;
ALTER TABLE core.assets DROP CONSTRAINT IF EXISTS assets_currency_code_fkey;

-- 3. Thay đổi columns thành fixed 'VND' với default value
ALTER TABLE core.users ALTER COLUMN preferred_currency SET DEFAULT 'VND';
ALTER TABLE core.groups ALTER COLUMN base_currency SET DEFAULT 'VND';
ALTER TABLE core.group_funds ALTER COLUMN currency SET DEFAULT 'VND';
ALTER TABLE core.accounts ALTER COLUMN currency_code SET DEFAULT 'VND';
ALTER TABLE core.receipts ALTER COLUMN currency SET DEFAULT 'VND';
ALTER TABLE core.budgets ALTER COLUMN currency_code SET DEFAULT 'VND';
ALTER TABLE core.goals ALTER COLUMN currency_code SET DEFAULT 'VND';
ALTER TABLE core.debts ALTER COLUMN currency_code SET DEFAULT 'VND';
ALTER TABLE core.child_wallets ALTER COLUMN currency SET DEFAULT 'VND';

-- Set default for optional tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'schedules') THEN
        ALTER TABLE core.schedules ALTER COLUMN template_currency_code SET DEFAULT 'VND';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'monthly_summaries') THEN
        ALTER TABLE core.monthly_summaries ALTER COLUMN currency_code SET DEFAULT 'VND';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'core' AND table_name = 'assets') THEN
        ALTER TABLE core.assets ALTER COLUMN currency_code SET DEFAULT 'VND';
    END IF;
END $$;

-- 5. Drop bảng currencies (không cần nữa)
DROP TABLE IF EXISTS core.currencies CASCADE;

-- 6. Add comment để ghi nhận thay đổi
COMMENT ON COLUMN core.users.preferred_currency IS 'Fixed to VND - Vietnam market only';
COMMENT ON COLUMN core.accounts.currency_code IS 'Fixed to VND - Vietnam market only';
COMMENT ON COLUMN core.budgets.currency_code IS 'Fixed to VND - Vietnam market only';
COMMENT ON COLUMN core.goals.currency_code IS 'Fixed to VND - Vietnam market only';
COMMENT ON COLUMN core.debts.currency_code IS 'Fixed to VND - Vietnam market only';
