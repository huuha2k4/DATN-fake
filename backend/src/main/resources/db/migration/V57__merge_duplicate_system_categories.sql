-- V57: Merge duplicate system categories and point all references to canonical category IDs

-- 1. Migrate core.transactions
UPDATE core.transactions SET category_id = 'ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a' WHERE category_id = '22222222-2222-2222-2222-222222222221';
UPDATE core.transactions SET category_id = '87afc996-457d-4272-9b5f-14852f867ff9' WHERE category_id = '22222222-2222-2222-2222-222222222222';
UPDATE core.transactions SET category_id = 'd149b310-14d9-4756-a43c-3b8fb1ab2ecc' WHERE category_id = '11111111-1111-1111-1111-111111111111';

-- 2. Migrate core.budget_items
UPDATE core.budget_items SET category_id = 'ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a' WHERE category_id = '22222222-2222-2222-2222-222222222221';
UPDATE core.budget_items SET category_id = '87afc996-457d-4272-9b5f-14852f867ff9' WHERE category_id = '22222222-2222-2222-2222-222222222222';

-- 3. Migrate core.child_spend_requests
UPDATE core.child_spend_requests SET category_id = 'ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a' WHERE category_id = '22222222-2222-2222-2222-222222222221';

-- 4. Soft-delete duplicate V4 categories
UPDATE core.categories SET deleted_at = NOW() WHERE id IN (
    '22222222-2222-2222-2222-222222222221', -- Ăn uống
    '22222222-2222-2222-2222-222222222222', -- Di chuyển
    '22222222-2222-2222-2222-222222222223', -- Mua sắm
    '22222222-2222-2222-2222-222222222224', -- Giải trí
    '22222222-2222-2222-2222-222222222225', -- Hóa đơn & Tiện ích
    '22222222-2222-2222-2222-222222222226', -- Sức khỏe
    '22222222-2222-2222-2222-222222222227', -- Giáo dục
    '22222222-2222-2222-2222-222222222228', -- Du lịch
    '22222222-2222-2222-2222-222222222230', -- Nhà ở
    '11111111-1111-1111-1111-111111111111', -- Lương
    '11111111-1111-1111-1111-111111111112', -- Thưởng
    '11111111-1111-1111-1111-111111111113', -- Đầu tư
    '11111111-1111-1111-1111-111111111114', -- Kinh doanh
    '11111111-1111-1111-1111-111111111116'  -- Thu nhập khác
);

-- 5. Standardize display_order on canonical system categories
UPDATE core.categories SET display_order = 1 WHERE id = 'ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a';
UPDATE core.categories SET display_order = 2 WHERE id = '87afc996-457d-4272-9b5f-14852f867ff9';
UPDATE core.categories SET display_order = 3 WHERE id = '084a0f8c-445a-4299-984b-d155367f1d30';
UPDATE core.categories SET display_order = 4 WHERE id = '6dbc1155-7e87-41e3-af7f-e4efb939978b';
UPDATE core.categories SET display_order = 5 WHERE id = 'dca02b01-c30c-4a34-b342-89dd7886c34d';
UPDATE core.categories SET display_order = 6 WHERE id = '42c96889-fe24-4e44-9baf-90a5098ab79f';
UPDATE core.categories SET display_order = 7 WHERE id = 'c48ec970-cea2-4041-9365-02472b018eb5';
UPDATE core.categories SET display_order = 8 WHERE id = '727ad1de-0182-41d3-a891-f2b1581b016f';
UPDATE core.categories SET display_order = 9 WHERE id = '11fb6fe0-b86a-401c-b455-e834400a14ab';

