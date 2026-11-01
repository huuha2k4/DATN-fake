ALTER TABLE core.child_chores
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE core.child_chores
SET updated_at = created_at
WHERE updated_at IS NULL;
