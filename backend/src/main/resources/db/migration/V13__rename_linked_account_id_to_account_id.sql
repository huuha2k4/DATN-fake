-- Rename linked_account_id to account_id for better naming convention

-- Goals table
ALTER TABLE core.goals 
    RENAME COLUMN linked_account_id TO account_id;

-- Debts table  
ALTER TABLE core.debts 
    RENAME COLUMN linked_account_id TO account_id;

-- Assets table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'core' 
        AND table_name = 'assets' 
        AND column_name = 'linked_account_id'
    ) THEN
        ALTER TABLE core.assets 
            RENAME COLUMN linked_account_id TO account_id;
    END IF;
END $$;
