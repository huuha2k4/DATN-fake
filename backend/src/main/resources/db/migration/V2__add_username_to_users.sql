-- Add username column to users table
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON core.users(username) WHERE username IS NOT NULL;

-- Add comment
COMMENT ON COLUMN core.users.username IS 'Username for login (alternative to email)';
