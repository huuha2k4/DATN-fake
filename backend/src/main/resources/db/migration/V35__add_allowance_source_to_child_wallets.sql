ALTER TABLE core.child_wallets
    ADD COLUMN IF NOT EXISTS allowance_source VARCHAR(30) DEFAULT 'PERSONAL_ACCOUNT',
    ADD COLUMN IF NOT EXISTS allowance_account_id UUID REFERENCES core.accounts(id) ON DELETE SET NULL;

