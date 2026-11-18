-- =====================================================
-- V49: Add login_alert_enabled and ensure 2FA support in users
-- =====================================================
-- Description: Add login_alert_enabled to core.users
--              (mfa_enabled is already present in core.users for 2FA)
-- Author: System
-- Date: 2026-11-09
-- =====================================================

ALTER TABLE core.users
ADD COLUMN IF NOT EXISTS login_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;
