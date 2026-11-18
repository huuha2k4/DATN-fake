ALTER TABLE core.group_settlements
  ADD COLUMN IF NOT EXISTS from_account_id UUID REFERENCES core.accounts(id),
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES core.accounts(id),
  ADD COLUMN IF NOT EXISTS outgoing_transaction_id UUID REFERENCES core.transactions(id),
  ADD COLUMN IF NOT EXISTS incoming_transaction_id UUID REFERENCES core.transactions(id);
