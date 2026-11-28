ALTER TABLE core.fund_reimbursements
    ADD COLUMN authorized_account_id UUID REFERENCES core.accounts(id) ON DELETE SET NULL;
