-- Insert system categories (accessible to all users)
-- parent_id is NULL for root categories

-- INCOME categories
INSERT INTO core.categories (id, user_id, parent_id, code, name, kind, icon, color, is_system, display_order, created_at, updated_at, version) VALUES
('11111111-1111-1111-1111-111111111111', NULL, NULL, 'SALARY_SYS', 'Lương', 'INCOME', '💰', '#10b981', true, 1, NOW(), NOW(), 0),
('11111111-1111-1111-1111-111111111112', NULL, NULL, 'BONUS_SYS', 'Thưởng', 'INCOME', '🎁', '#059669', true, 2, NOW(), NOW(), 0),
('11111111-1111-1111-1111-111111111113', NULL, NULL, 'INVESTMENT_SYS', 'Đầu tư', 'INCOME', '📈', '#0d9488', true, 3, NOW(), NOW(), 0),
('11111111-1111-1111-1111-111111111114', NULL, NULL, 'BUSINESS_SYS', 'Kinh doanh', 'INCOME', '💼', '#0284c7', true, 4, NOW(), NOW(), 0),
('11111111-1111-1111-1111-111111111115', NULL, NULL, 'GIFT_SYS', 'Quà tặng', 'INCOME', '🎉', '#8b5cf6', true, 5, NOW(), NOW(), 0),
('11111111-1111-1111-1111-111111111116', NULL, NULL, 'OTHER_INCOME_SYS', 'Thu nhập khác', 'INCOME', '💵', '#16a34a', true, 6, NOW(), NOW(), 0)
ON CONFLICT DO NOTHING;

-- EXPENSE categories (root)
INSERT INTO core.categories (id, user_id, parent_id, code, name, kind, icon, color, is_system, display_order, created_at, updated_at, version) VALUES
-- Food & Drinks
('22222222-2222-2222-2222-222222222221', NULL, NULL, 'FOOD_DRINKS', 'Ăn uống', 'EXPENSE', '🍔', '#FF6B6B', true, 1, NOW(), NOW(), 0),
-- Transportation
('22222222-2222-2222-2222-222222222222', NULL, NULL, 'TRANSPORT', 'Di chuyển', 'EXPENSE', '🚗', '#4D96FF', true, 2, NOW(), NOW(), 0),
-- Shopping
('22222222-2222-2222-2222-222222222223', NULL, NULL, 'SHOPPING', 'Mua sắm', 'EXPENSE', '🛍️', '#9C27B0', true, 3, NOW(), NOW(), 0),
-- Entertainment
('22222222-2222-2222-2222-222222222224', NULL, NULL, 'ENTERTAINMENT', 'Giải trí', 'EXPENSE', '🎬', '#FF9800', true, 4, NOW(), NOW(), 0),
-- Bills & Utilities
('22222222-2222-2222-2222-222222222225', NULL, NULL, 'BILLS', 'Hóa đơn & Tiện ích', 'EXPENSE', '📄', '#607D8B', true, 5, NOW(), NOW(), 0),
-- Health & Fitness
('22222222-2222-2222-2222-222222222226', NULL, NULL, 'HEALTH', 'Sức khỏe', 'EXPENSE', '💊', '#E91E63', true, 6, NOW(), NOW(), 0),
-- Education
('22222222-2222-2222-2222-222222222227', NULL, NULL, 'EDUCATION', 'Giáo dục', 'EXPENSE', '📚', '#3F51B5', true, 7, NOW(), NOW(), 0),
-- Travel
('22222222-2222-2222-2222-222222222228', NULL, NULL, 'TRAVEL', 'Du lịch', 'EXPENSE', '✈️', '#00BCD4', true, 8, NOW(), NOW(), 0),
-- Family & Kids
('22222222-2222-2222-2222-222222222229', NULL, NULL, 'FAMILY', 'Gia đình & Con cái', 'EXPENSE', '👨‍👩‍👧‍👦', '#8BC34A', true, 9, NOW(), NOW(), 0),
-- Housing
('22222222-2222-2222-2222-222222222230', NULL, NULL, 'HOUSING', 'Nhà ở', 'EXPENSE', '🏠', '#795548', true, 10, NOW(), NOW(), 0),
-- Other
('22222222-2222-2222-2222-222222222231', NULL, NULL, 'OTHER_EXPENSE', 'Chi phí khác', 'EXPENSE', '📝', '#9E9E9E', true, 11, NOW(), NOW(), 0)
ON CONFLICT DO NOTHING;


