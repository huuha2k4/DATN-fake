-- V22: Rename contribution_date to contributed_at and change type to timestamp to match entity

-- Rename column and change type from date to timestamp
ALTER TABLE core.goal_contributions 
RENAME COLUMN contribution_date TO contributed_at;

ALTER TABLE core.goal_contributions 
ALTER COLUMN contributed_at TYPE TIMESTAMP USING contributed_at::timestamp;

-- Update default to current timestamp instead of just date
ALTER TABLE core.goal_contributions 
ALTER COLUMN contributed_at SET DEFAULT CURRENT_TIMESTAMP;

-- Drop old index and create new one with correct column name
DROP INDEX IF EXISTS core.idx_goal_contributions_goal;
CREATE INDEX idx_goal_contribution_goal_id ON core.goal_contributions(goal_id);
CREATE INDEX idx_goal_contribution_contributed_at ON core.goal_contributions(contributed_at);

-- Add source_account_id column if not exists (for tracking which account the contribution came from)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'goal_contributions' 
        AND column_name = 'source_account_id'
    ) THEN
        ALTER TABLE core.goal_contributions ADD COLUMN source_account_id UUID;
    END IF;
END $$;

-- Add version column for optimistic locking if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'goal_contributions' 
        AND column_name = 'version'
    ) THEN
        ALTER TABLE core.goal_contributions ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
END $$;

COMMENT ON COLUMN core.goal_contributions.contributed_at IS 'Timestamp when the contribution was made (changed from date to timestamp for precision)';
COMMENT ON COLUMN core.goal_contributions.source_account_id IS 'Optional reference to the account from which the contribution was made';
