-- Group finance business model. All changes are additive and legacy-safe.

CREATE TABLE core.group_finance_configs (
    group_id UUID PRIMARY KEY REFERENCES core.groups(id),
    use_shared_fund BOOLEAN NOT NULL DEFAULT TRUE,
    use_contribution_periods BOOLEAN NOT NULL DEFAULT TRUE,
    allow_member_splits BOOLEAN NOT NULL DEFAULT TRUE,
    allow_debt_simplification BOOLEAN NOT NULL DEFAULT TRUE,
    allow_fund_reimbursements BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_finance_config_simplification
        CHECK (NOT allow_debt_simplification OR allow_member_splits),
    CONSTRAINT chk_finance_config_periods
        CHECK (NOT use_contribution_periods OR use_shared_fund),
    CONSTRAINT chk_finance_config_reimbursements
        CHECK (NOT allow_fund_reimbursements OR use_shared_fund)
);

INSERT INTO core.group_finance_configs (
    group_id, use_shared_fund, use_contribution_periods, allow_member_splits,
    allow_debt_simplification, allow_fund_reimbursements
)
SELECT id, TRUE, TRUE,
       CASE WHEN group_type IN ('ROOMMATE', 'TRAVEL') THEN TRUE ELSE FALSE END,
       CASE WHEN group_type IN ('ROOMMATE', 'TRAVEL') THEN TRUE ELSE FALSE END,
       TRUE
FROM core.groups
ON CONFLICT (group_id) DO NOTHING;

CREATE TABLE core.contribution_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id),
    name VARCHAR(160) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    allocation_method VARCHAR(20) NOT NULL
        CHECK (allocation_method IN ('EQUAL', 'EXACT', 'PERCENTAGE', 'VOLUNTARY')),
    frequency VARCHAR(20) NOT NULL DEFAULT 'ONCE'
        CHECK (frequency IN ('ONCE', 'WEEKLY', 'MONTHLY', 'QUARTERLY')),
    required_total NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (required_total >= 0),
    fundraising_target NUMERIC(19,4) CHECK (fundraising_target IS NULL OR fundraising_target > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED')),
    recurrence_key VARCHAR(180),
    created_by_user_id UUID NOT NULL REFERENCES core.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_contribution_period_dates CHECK (due_date >= start_date),
    CONSTRAINT uq_contribution_period_recurrence UNIQUE (group_id, recurrence_key)
);

CREATE INDEX idx_contribution_period_group_status
    ON core.contribution_periods(group_id, status, due_date DESC);

CREATE UNIQUE INDEX uq_contribution_period_one_active
    ON core.contribution_periods(group_id) WHERE status = 'ACTIVE';

CREATE TABLE core.member_contribution_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES core.contribution_periods(id),
    user_id UUID NOT NULL REFERENCES core.users(id),
    required_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (required_amount >= 0),
    allocation_percentage NUMERIC(7,4)
        CHECK (allocation_percentage IS NULL OR allocation_percentage BETWEEN 0 AND 100),
    exempt BOOLEAN NOT NULL DEFAULT FALSE,
    exemption_reason VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_period_member_obligation UNIQUE (period_id, user_id),
    CONSTRAINT chk_exempt_obligation_amount CHECK (NOT exempt OR required_amount = 0)
);

CREATE INDEX idx_contribution_obligation_user
    ON core.member_contribution_obligations(user_id, period_id);

ALTER TABLE core.group_fund_contributions
    ALTER COLUMN source_account_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES core.contribution_periods(id),
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(24) NOT NULL DEFAULT 'MANAGED_ACCOUNT'
        CHECK (source_type IN ('MANAGED_ACCOUNT', 'EXTERNAL_TRANSFER', 'CASH', 'OTHER')),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
    ADD COLUMN IF NOT EXISTS confirmed_by_user_id UUID REFERENCES core.users(id),
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_by_user_id UUID REFERENCES core.users(id),
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE core.group_fund_contributions
SET status = 'CONFIRMED', source_type = 'MANAGED_ACCOUNT', confirmed_at = created_at
WHERE status = 'CONFIRMED';

CREATE UNIQUE INDEX uq_group_contribution_idempotency
    ON core.group_fund_contributions(contributor_user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_group_contribution_period_status
    ON core.group_fund_contributions(period_id, status, created_at DESC);

ALTER TABLE core.group_expense_splits
    ADD CONSTRAINT uq_group_expense_split_member UNIQUE (expense_id, user_id);

ALTER TABLE core.group_expenses
    ADD COLUMN IF NOT EXISTS financial_purpose VARCHAR(32) NOT NULL DEFAULT 'MEMBER_SPLIT'
        CHECK (financial_purpose IN ('MEMBER_SPLIT', 'FUND_EXPENSE', 'FUND_REIMBURSEMENT', 'VOLUNTARY_SPEND'));

UPDATE core.group_expenses
SET financial_purpose = CASE
    WHEN payment_source = 'GROUP_FUND' THEN 'FUND_EXPENSE'
    ELSE 'MEMBER_SPLIT'
END;

CREATE TABLE core.fund_reimbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES core.groups(id),
    expense_id UUID NOT NULL UNIQUE REFERENCES core.group_expenses(id),
    beneficiary_user_id UUID NOT NULL REFERENCES core.users(id),
    total_amount NUMERIC(19,4) NOT NULL CHECK (total_amount > 0),
    reimbursed_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (reimbursed_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_reimbursement_progress CHECK (reimbursed_amount <= total_amount)
);

CREATE INDEX idx_fund_reimbursement_group_status
    ON core.fund_reimbursements(group_id, status, created_at DESC);

CREATE TABLE core.fund_reimbursement_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES core.fund_reimbursements(id),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    destination_account_id UUID REFERENCES core.accounts(id),
    personal_transaction_id UUID REFERENCES core.transactions(id),
    paid_by_user_id UUID NOT NULL REFERENCES core.users(id),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    idempotency_key VARCHAR(100),
    CONSTRAINT uq_reimbursement_payment_idempotency
        UNIQUE (reimbursement_id, idempotency_key)
);

ALTER TABLE core.group_settlements
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE core.group_settlements DROP CONSTRAINT IF EXISTS group_settlements_status_check;
ALTER TABLE core.group_settlements
    ADD CONSTRAINT group_settlements_status_check
    CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'));

CREATE OR REPLACE FUNCTION core.touch_group_finance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_group_finance_configs_updated_at
BEFORE UPDATE ON core.group_finance_configs
FOR EACH ROW EXECUTE FUNCTION core.touch_group_finance_updated_at();

CREATE TRIGGER trg_contribution_periods_updated_at
BEFORE UPDATE ON core.contribution_periods
FOR EACH ROW EXECUTE FUNCTION core.touch_group_finance_updated_at();

CREATE TRIGGER trg_member_obligations_updated_at
BEFORE UPDATE ON core.member_contribution_obligations
FOR EACH ROW EXECUTE FUNCTION core.touch_group_finance_updated_at();

CREATE TRIGGER trg_fund_reimbursements_updated_at
BEFORE UPDATE ON core.fund_reimbursements
FOR EACH ROW EXECUTE FUNCTION core.touch_group_finance_updated_at();
