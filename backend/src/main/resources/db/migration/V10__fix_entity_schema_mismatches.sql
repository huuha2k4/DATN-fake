-- ============================================================================
-- Migration V10: Fix All Entity-Database Schema Mismatches
-- Description: Comprehensive migration to sync database schema with entity classes
-- ============================================================================

-- ============================================================================
-- SECTION 1: USERS TABLE FIXES
-- ============================================================================

-- Add email_verified column
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Update email_verified based on email_verified_at
UPDATE core.users SET email_verified = TRUE WHERE email_verified_at IS NOT NULL;

-- Add full_name column
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);

-- Add MFA columns
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);

-- Add password_changed_at
ALTER TABLE core.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Rename columns with conditional checks
DO $$
BEGIN
    -- Rename failed_login_count to failed_login_attempts
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'users' AND column_name = 'failed_login_count') THEN
        ALTER TABLE core.users RENAME COLUMN failed_login_count TO failed_login_attempts;
    END IF;

    -- Rename status to user_status
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE core.users RENAME COLUMN status TO user_status;
    END IF;

    -- Rename locale to language
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'users' AND column_name = 'locale') THEN
        ALTER TABLE core.users RENAME COLUMN locale TO language;
    END IF;

    -- Rename base_currency to preferred_currency
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'users' AND column_name = 'base_currency') THEN
        ALTER TABLE core.users RENAME COLUMN base_currency TO preferred_currency;
    END IF;
END $$;

-- Remove foreign key constraint on preferred_currency
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_base_currency_fkey;

-- Convert enum columns to VARCHAR for Hibernate compatibility
ALTER TABLE core.users ALTER COLUMN subscription_tier TYPE VARCHAR(20) USING subscription_tier::TEXT;
ALTER TABLE core.users ALTER COLUMN system_role TYPE VARCHAR(20) USING system_role::TEXT;
ALTER TABLE core.users ALTER COLUMN user_status TYPE VARCHAR(20) USING user_status::TEXT;

-- Set default values
ALTER TABLE core.users ALTER COLUMN subscription_tier SET DEFAULT 'FREE';
ALTER TABLE core.users ALTER COLUMN system_role SET DEFAULT 'USER';
ALTER TABLE core.users ALTER COLUMN user_status SET DEFAULT 'ACTIVE';

-- ============================================================================
-- SECTION 2: AUTH_TOKENS TABLE FIXES
-- ============================================================================

DO $$
BEGIN
    -- Rename kind to token_type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'auth_tokens' AND column_name = 'kind') THEN
        ALTER TABLE core.auth_tokens RENAME COLUMN kind TO token_type;
    END IF;

    -- Rename token_hash to token and change type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'auth_tokens' AND column_name = 'token_hash') THEN
        ALTER TABLE core.auth_tokens RENAME COLUMN token_hash TO token;
        ALTER TABLE core.auth_tokens ALTER COLUMN token TYPE VARCHAR(255);
    END IF;
END $$;

-- Add used column
ALTER TABLE core.auth_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;

-- Update used column based on used_at
UPDATE core.auth_tokens SET used = TRUE WHERE used_at IS NOT NULL;

-- Drop old constraints and create new ones
ALTER TABLE core.auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_kind_check;
ALTER TABLE core.auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_token_type_check;
ALTER TABLE core.auth_tokens ADD CONSTRAINT auth_tokens_token_type_check 
    CHECK (token_type IN ('VERIFY_EMAIL', 'RESET_PASSWORD', 'PASSWORD_RESET', 'EMAIL_VERIFICATION'));

-- ============================================================================
-- SECTION 3: REFRESH_TOKENS TABLE FIXES
-- ============================================================================

DO $$
BEGIN
    -- Rename token_hash to token if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'core' AND table_name = 'refresh_tokens' AND column_name = 'token_hash') THEN
        ALTER TABLE core.refresh_tokens RENAME COLUMN token_hash TO token;
        ALTER TABLE core.refresh_tokens ALTER COLUMN token TYPE VARCHAR(500);
    END IF;
    
    -- Ensure token column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'core' AND table_name = 'refresh_tokens' AND column_name = 'token') THEN
        ALTER TABLE core.refresh_tokens ADD COLUMN token VARCHAR(500) UNIQUE NOT NULL;
    END IF;
    
    -- Add revoked column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'core' AND table_name = 'refresh_tokens' AND column_name = 'revoked') THEN
        ALTER TABLE core.refresh_tokens ADD COLUMN revoked BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- Add revoked_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'core' AND table_name = 'refresh_tokens' AND column_name = 'revoked_at') THEN
        ALTER TABLE core.refresh_tokens ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
