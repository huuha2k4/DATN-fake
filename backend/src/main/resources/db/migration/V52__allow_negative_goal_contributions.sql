-- Allow negative amounts for withdrawals from goals/savings
ALTER TABLE core.goal_contributions ALTER COLUMN amount TYPE numeric(19,4);

