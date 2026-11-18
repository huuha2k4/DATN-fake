-- A group owns an internal, privacy-safe cash fund. Personal account IDs are
-- recorded only on the contribution/expense ledger and are never exposed by
-- group history endpoints.
CREATE TABLE core.group_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL UNIQUE REFERENCES core.groups(id) ON DELETE CASCADE,
    currency CHAR(3) NOT NULL REFERENCES core.currencies(code),
    balance NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE core.group_fund_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES core.group_funds(id) ON DELETE CASCADE,
    contributor_user_id UUID NOT NULL REFERENCES core.users(id),
    source_account_id UUID NOT NULL REFERENCES core.accounts(id),
    personal_transaction_id UUID REFERENCES core.transactions(id),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    contributed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO core.group_funds (group_id, currency, balance)
SELECT g.id, g.base_currency, 0
FROM core.groups g
ON CONFLICT (group_id) DO NOTHING;

ALTER TABLE core.group_expenses
    ADD COLUMN IF NOT EXISTS payment_source VARCHAR(20) NOT NULL DEFAULT 'PERSONAL_ACCOUNT'
        CHECK (payment_source IN ('GROUP_FUND', 'PERSONAL_ACCOUNT')),
    ADD COLUMN IF NOT EXISTS source_account_id UUID REFERENCES core.accounts(id),
    ADD COLUMN IF NOT EXISTS personal_transaction_id UUID REFERENCES core.transactions(id);

CREATE INDEX idx_group_fund_contributions_fund ON core.group_fund_contributions(fund_id, created_at DESC);
CREATE INDEX idx_group_expenses_payment_source ON core.group_expenses(group_id, payment_source);
