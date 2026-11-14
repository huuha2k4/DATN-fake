-- Thêm danh mục Thu nhập: Tiền rút từ mục tiêu, tiết kiệm
INSERT INTO core.categories (
    id,
    code,
    name,
    kind,
    icon,
    color,
    is_system,
    is_essential,
    display_order
) VALUES (
    '11111111-1111-1111-1111-111111111118',
    'SAVINGS_WITHDRAWAL',
    'Tiết kiệm, đầu tư',
    'INCOME',
    'piggy-bank',
    '#059669',
    true,
    false,
    21
) ON CONFLICT (code) DO NOTHING;

