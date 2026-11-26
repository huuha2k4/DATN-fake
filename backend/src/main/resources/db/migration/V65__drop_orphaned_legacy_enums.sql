-- V65: Drop 24 orphaned PostgreSQL ENUM types from historical migrations (V5-V36 converted columns to VARCHAR).
-- Keeps account_type_enum, subscription_tier_enum, and job_status_enum (used by retained tables).
-- Does NOT use CASCADE.

-- Detach legacy default cast on core.transactions.source (column is already VARCHAR since V12)
ALTER TABLE core.transactions ALTER COLUMN source SET DEFAULT 'MANUAL';

DROP TYPE IF EXISTS core.activity_type_enum;
DROP TYPE IF EXISTS core.category_kind_enum;
DROP TYPE IF EXISTS core.category_status_enum;
DROP TYPE IF EXISTS core.child_privacy_level_enum;
DROP TYPE IF EXISTS core.chore_status_enum;
DROP TYPE IF EXISTS core.debt_status_enum;
DROP TYPE IF EXISTS core.debt_type_enum;
DROP TYPE IF EXISTS core.frequency_type_enum;
DROP TYPE IF EXISTS core.goal_priority_enum;
DROP TYPE IF EXISTS core.goal_status_enum;
DROP TYPE IF EXISTS core.goal_type_enum;
DROP TYPE IF EXISTS core.message_type_enum;
DROP TYPE IF EXISTS core.ocr_status_enum;
DROP TYPE IF EXISTS core.period_type_enum;
DROP TYPE IF EXISTS core.recur_status_enum;
DROP TYPE IF EXISTS core.reminder_type_enum;
DROP TYPE IF EXISTS core.settlement_status_enum;
DROP TYPE IF EXISTS core.share_role_enum;
DROP TYPE IF EXISTS core.spend_request_status_enum;
DROP TYPE IF EXISTS core.split_type_enum;
DROP TYPE IF EXISTS core.system_role_enum;
DROP TYPE IF EXISTS core.transaction_source_enum;
DROP TYPE IF EXISTS core.transaction_type_enum;
DROP TYPE IF EXISTS core.user_status_enum;
