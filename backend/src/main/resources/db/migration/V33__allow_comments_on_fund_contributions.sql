ALTER TABLE core.transaction_comments
    DROP CONSTRAINT IF EXISTS transaction_comments_commentable_type_check;

ALTER TABLE core.transaction_comments
    ADD CONSTRAINT transaction_comments_commentable_type_check
    CHECK (commentable_type IN ('TRANSACTION', 'GROUP_EXPENSE', 'FUND_CONTRIBUTION'));
