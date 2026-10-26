-- Convert enum columns to VARCHAR in categories table for JPA compatibility

-- Convert kind from ENUM to VARCHAR
ALTER TABLE core.categories 
    ALTER COLUMN kind TYPE VARCHAR(20) USING kind::text;
