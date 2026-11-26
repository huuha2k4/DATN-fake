-- V64: Remove 12 approved abandoned and legacy tables, their direct FK columns, and orphaned ENUMs
-- Note: Does NOT use DROP TABLE CASCADE. Preserves all 16 future-development tables and 45 active/system tables.

-- 1. Drop FK constraints and columns on retained tables that pointed to core.merchants
ALTER TABLE core.transactions DROP CONSTRAINT IF EXISTS transactions_merchant_id_fkey;
ALTER TABLE core.transactions DROP COLUMN IF EXISTS merchant_id;

ALTER TABLE core.schedules DROP CONSTRAINT IF EXISTS schedules_template_merchant_id_fkey;
ALTER TABLE core.schedules DROP COLUMN IF EXISTS template_merchant_id;

-- 2. Drop join / child tables before parent tables (strict dependency order)
DROP TABLE IF EXISTS core.transaction_tags;
DROP TABLE IF EXISTS core.tags;
DROP TABLE IF EXISTS core.merchants;

DROP TABLE IF EXISTS core.goal_milestones;

DROP TABLE IF EXISTS core.asset_valuations;
DROP TABLE IF EXISTS core.assets;

-- 3. Drop legacy tables replaced by newer schema designs
DROP TABLE IF EXISTS core.mfa_credentials;
DROP TABLE IF EXISTS core.attachments;
DROP TABLE IF EXISTS core.exchange_rates;
DROP TABLE IF EXISTS core.user_profiles;

DROP TABLE IF EXISTS ops.notifications;
DROP TABLE IF EXISTS ops.device_tokens;

-- 4. Drop ENUM types that were exclusively used by the removed ops.notifications table
DROP TYPE IF EXISTS core.notification_channel_enum;
DROP TYPE IF EXISTS core.notification_status_enum;
