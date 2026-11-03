-- V37: Add receipt_url to core.transactions and sync with core.receipts
ALTER TABLE core.transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

UPDATE core.transactions t
SET receipt_url = r.image_url
FROM core.receipts r
WHERE t.receipt_id = r.id AND t.receipt_url IS NULL;

UPDATE core.transactions t
SET receipt_id = r.id, receipt_url = r.image_url
FROM core.receipts r
WHERE r.transaction_id = t.id AND t.receipt_url IS NULL;
