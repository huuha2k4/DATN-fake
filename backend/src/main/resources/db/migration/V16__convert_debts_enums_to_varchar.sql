-- Convert enum columns to VARCHAR in debts table for JPA compatibility

-- Drop constraints and indexes that depend on enum types
DROP INDEX IF EXISTS core.idx_debts_due_date;
DROP INDEX IF EXISTS core.idx_debts_user_status;

-- Convert debt_type from ENUM to VARCHAR
ALTER TABLE core.debts 
    ALTER COLUMN debt_type TYPE VARCHAR(20) USING debt_type::text;

-- Convert status from ENUM to VARCHAR
ALTER TABLE core.debts 
    ALTER COLUMN status TYPE VARCHAR(20) USING status::text;

-- Set default values
ALTER TABLE core.debts 
    ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Recreate indexes with VARCHAR types
CREATE INDEX idx_debts_user_status ON core.debts(user_id, status);
CREATE INDEX idx_debts_due_date ON core.debts(due_date) 
    WHERE status IN ('ACTIVE', 'OVERDUE');
