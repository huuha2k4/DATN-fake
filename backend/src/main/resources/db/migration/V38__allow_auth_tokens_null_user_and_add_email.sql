-- V38: Allow auth_tokens to store pre-registration verification tokens without user_id
ALTER TABLE core.auth_tokens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE core.auth_tokens ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON core.auth_tokens (email);

