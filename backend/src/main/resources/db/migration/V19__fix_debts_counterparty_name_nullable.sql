-- Make counterparty_name nullable since we're using creditor_name/debtor_name now

ALTER TABLE core.debts 
    ALTER COLUMN counterparty_name DROP NOT NULL;
