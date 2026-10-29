-- V27: Add DEBT_COLLECTION system category for collecting money lent to others
INSERT INTO core.categories (id, user_id, parent_id, code, name, kind, icon, color, is_system, display_order, created_at, updated_at, version)
VALUES ('11111111-1111-1111-1111-111111111117', NULL, NULL, 'DEBT_COLLECTION', 'Thu nợ', 'INCOME', 'hand-coins', '#10b981', true, 7, NOW(), NOW(), 0)
ON CONFLICT (id) DO NOTHING;
