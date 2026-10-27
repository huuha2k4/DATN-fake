-- V21: Create goal_milestones table for tracking goal progress milestones

CREATE TABLE core.goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL,
    name VARCHAR(100),
    percentage INTEGER NOT NULL,
    target_amount NUMERIC(15,2) NOT NULL,
    achieved BOOLEAN NOT NULL DEFAULT false,
    achieved_at TIMESTAMP,
    reward VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0,
    
    CONSTRAINT fk_goal_milestone_goal FOREIGN KEY (goal_id) 
        REFERENCES core.goals(id) ON DELETE CASCADE
);

-- Create index for faster goal lookups
CREATE INDEX idx_goal_milestone_goal_id ON core.goal_milestones(goal_id);

-- Create index for unachieved milestones queries
CREATE INDEX idx_goal_milestone_achieved ON core.goal_milestones(goal_id, achieved);

-- Add comment
COMMENT ON TABLE core.goal_milestones IS 'Tracks milestones/checkpoints for financial goals to celebrate progress';
COMMENT ON COLUMN core.goal_milestones.percentage IS 'Progress percentage when this milestone is reached (e.g., 25, 50, 75)';
COMMENT ON COLUMN core.goal_milestones.target_amount IS 'Amount value when this milestone is reached';
COMMENT ON COLUMN core.goal_milestones.reward IS 'Optional reward/celebration message when milestone is achieved';
