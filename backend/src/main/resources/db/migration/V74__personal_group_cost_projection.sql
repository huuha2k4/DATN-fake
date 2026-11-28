-- Reporting only. The view never posts, deletes, or replaces a wallet transaction.
CREATE VIEW core.personal_report_entries AS
SELECT t.id, t.user_id, t.account_id, t.category_id, t.type, t.occurred_date,
       t.base_amount AS amount, t.description_raw AS description
FROM core.transactions t
WHERE t.deleted_at IS NULL AND NOT t.is_excluded_from_report
  AND t.type IN ('INCOME', 'EXPENSE')
  AND NOT EXISTS (SELECT 1 FROM core.group_fund_contributions c WHERE c.personal_transaction_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM core.group_settlements s
      WHERE s.outgoing_transaction_id = t.id OR s.incoming_transaction_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM core.fund_reimbursement_payments p WHERE p.personal_transaction_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM core.group_expenses e WHERE e.personal_transaction_id = t.id
      AND e.financial_purpose IN ('MEMBER_SPLIT', 'FUND_REIMBURSEMENT'))
UNION ALL
SELECT s.id, s.user_id, CASE WHEN s.user_id = e.paid_by_user_id THEN e.source_account_id END,
       e.category_id, 'EXPENSE', e.expense_date,
       s.amount * COALESCE(t.base_amount / NULLIF(t.amount, 0), 1), e.description
FROM core.group_expense_splits s
JOIN core.group_expenses e ON e.id = s.expense_id
LEFT JOIN core.transactions t ON t.id = e.personal_transaction_id
WHERE e.deleted_at IS NULL AND e.financial_purpose = 'MEMBER_SPLIT' AND s.amount > 0;
