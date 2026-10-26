-- Migration V7: Fix schedules tables schema and enums
-- Drop existing old-style table if exists
DROP TABLE IF EXISTS core.schedule_occurrences CASCADE;
DROP TABLE IF EXISTS core.schedules CASCADE;

-- Recreate core.schedules with correct BIGSERIAL PK, UUID FKs, and VARCHAR status matching JPA entity
CREATE TABLE IF NOT EXISTS core.schedules (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('TRANSACTION', 'REMINDER')),
    name VARCHAR(255) NOT NULL,
    recurrence_rule VARCHAR(500) NOT NULL,
    recurrence_text VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    next_occurrence_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    template_transaction_type VARCHAR(20) CHECK (template_transaction_type IS NULL OR template_transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    template_account_id UUID REFERENCES core.accounts(id) ON DELETE SET NULL,
    template_to_account_id UUID REFERENCES core.accounts(id) ON DELETE SET NULL,
    template_amount NUMERIC(19, 4) CHECK (template_amount IS NULL OR template_amount > 0),
    template_currency_code VARCHAR(3),
    template_category_id UUID REFERENCES core.categories(id) ON DELETE SET NULL,
    template_merchant_id UUID REFERENCES core.merchants(id) ON DELETE SET NULL,
    template_description TEXT,
    template_note TEXT,
    reminder_message TEXT,
    auto_execute BOOLEAN NOT NULL DEFAULT FALSE,
    notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notification_time_before_minutes INTEGER,
    notification_channels VARCHAR(100),
    total_occurrences INTEGER NOT NULL DEFAULT 0,
    executed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP,
    paused_at TIMESTAMP,
    pause_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON core.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON core.schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_type ON core.schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_schedules_next_occurrence ON core.schedules(next_occurrence_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_status ON core.schedules(user_id, status) WHERE deleted_at IS NULL;

-- Recreate core.schedule_occurrences table
CREATE TABLE IF NOT EXISTS core.schedule_occurrences (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL REFERENCES core.schedules(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'SKIPPED', 'FAILED')),
    transaction_id UUID REFERENCES core.transactions(id) ON DELETE SET NULL,
    executed_at TIMESTAMP,
    actual_execution_date DATE,
    skip_reason TEXT,
    skipped_at TIMESTAMP,
    failure_reason TEXT,
    failed_at TIMESTAMP,
    retry_count INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_occurrences_schedule_id ON core.schedule_occurrences(schedule_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_status ON core.schedule_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_occurrences_scheduled_date ON core.schedule_occurrences(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_occurrences_schedule_status ON core.schedule_occurrences(schedule_id, status);
