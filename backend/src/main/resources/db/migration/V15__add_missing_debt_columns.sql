-- Add missing columns to debts table to match Entity

ALTER TABLE core.debts
    ADD COLUMN IF NOT EXISTS creditor_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS creditor_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS creditor_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS debtor_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS debtor_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS debtor_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20),
    ADD COLUMN IF NOT EXISTS next_payment_date DATE,
    ADD COLUMN IF NOT EXISTS interest_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER,
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS category_id UUID;

-- Add foreign key for category_id
ALTER TABLE core.debts
    ADD CONSTRAINT debts_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES core.categories(id)
    ON DELETE SET NULL;

-- Migrate data from counterparty_name based on debt_type
-- For OWED_TO_ME (cho vay): counterparty is debtor (người vay)
UPDATE core.debts 
SET debtor_name = counterparty_name 
WHERE debt_type = 'OWED_TO_ME'::core.debt_type_enum AND debtor_name IS NULL;

-- For OWED_BY_ME (vay nợ): counterparty is creditor (người cho vay)
UPDATE core.debts 
SET creditor_name = counterparty_name 
WHERE debt_type = 'OWED_BY_ME'::core.debt_type_enum AND creditor_name IS NULL;
