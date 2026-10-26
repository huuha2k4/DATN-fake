-- Fix remaining enum in transactions table

-- Convert source from ENUM to VARCHAR
ALTER TABLE core.transactions 
    ALTER COLUMN source TYPE VARCHAR(20) USING source::text;
