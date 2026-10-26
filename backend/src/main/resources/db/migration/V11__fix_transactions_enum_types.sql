-- Fix enum types in transactions table to VARCHAR for JPA compatibility

-- Convert category_status from ENUM to VARCHAR
ALTER TABLE core.transactions 
    ALTER COLUMN category_status TYPE VARCHAR(20) USING category_status::text;

-- Set default value
ALTER TABLE core.transactions 
    ALTER COLUMN category_status SET DEFAULT 'CONFIRMED';

-- Convert source from ENUM to VARCHAR
ALTER TABLE core.transactions 
    ALTER COLUMN source TYPE VARCHAR(20) USING source::text;

-- Convert category_source from VARCHAR to VARCHAR (already correct, but ensure length)
ALTER TABLE core.transactions 
    ALTER COLUMN category_source TYPE VARCHAR(20);
