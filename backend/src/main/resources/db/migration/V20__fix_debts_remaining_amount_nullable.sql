-- V20: Make debts.remaining_amount nullable since it's a calculated field

ALTER TABLE core.debts 
ALTER COLUMN remaining_amount DROP NOT NULL;

-- Add comment explaining this is calculated from principal_amount - (paid_amount - interest_paid)
COMMENT ON COLUMN core.debts.remaining_amount IS 'Calculated field: principal_amount - (paid_amount - interest_paid). Can be NULL as it is computed by the application.';
