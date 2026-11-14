-- =====================================================
-- V48: Add notification_enabled to group_members
-- =====================================================
-- Description: Allow members to mute/unmute notifications per group
-- Author: System
-- Date: 2026-11-09
-- =====================================================

ALTER TABLE core.group_members
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT TRUE;

