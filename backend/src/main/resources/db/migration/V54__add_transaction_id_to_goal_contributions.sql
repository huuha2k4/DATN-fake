-- Thêm cột transaction_id vào goal_contributions nếu chưa có
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'goal_contributions' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE core.goal_contributions ADD COLUMN transaction_id UUID REFERENCES core.transactions(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_goal_contribution_transaction_id ON core.goal_contributions(transaction_id);
    END IF;
END $$;

