-- Migration V63: Fix users username unique constraint to ignore deleted users
-- Drop unconditional unique constraint on username
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_username_key;

-- Drop partial index if exists to recreate properly
DROP INDEX IF EXISTS core.idx_users_username;

-- Create partial unique index on username where deleted_at IS NULL
CREATE UNIQUE INDEX idx_users_username_active ON core.users (username) WHERE deleted_at IS NULL AND username IS NOT NULL;
