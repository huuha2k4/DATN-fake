-- Cập nhật các giao dịch nộp quỹ nhóm và bù trừ nhóm trước đây thành is_excluded_from_report = false để tính vào báo cáo tài chính
UPDATE core.transactions
SET is_excluded_from_report = false
WHERE is_excluded_from_report = true
  AND (
    description_raw ILIKE 'Nộp quỹ nhóm%' 
    OR description_raw ILIKE 'Bù trừ nhóm%' 
    OR description_raw ILIKE 'Nhận bù trừ nhóm%'
  );

