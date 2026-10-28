-- V26: Add user credentials support for child wallets
ALTER TABLE core.child_wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES core.users(id) ON DELETE SET NULL;
ALTER TABLE core.child_wallets ADD COLUMN IF NOT EXISTS child_username VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_child_wallets_user ON core.child_wallets(user_id);

