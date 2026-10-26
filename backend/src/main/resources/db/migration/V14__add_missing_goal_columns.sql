-- Add missing columns to goals table

ALTER TABLE core.goals
    ADD COLUMN IF NOT EXISTS icon VARCHAR(10),
    ADD COLUMN IF NOT EXISTS color VARCHAR(7),
    ADD COLUMN IF NOT EXISTS next_contribution_date DATE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_note VARCHAR(500),
    ADD COLUMN IF NOT EXISTS actual_amount_used NUMERIC(15,2);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_goal_target_date ON core.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goal_deleted_at ON core.goals(deleted_at);
