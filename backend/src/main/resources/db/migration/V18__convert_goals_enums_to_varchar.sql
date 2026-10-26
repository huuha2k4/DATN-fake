-- Convert enum columns to VARCHAR in goals table for JPA compatibility

-- Convert auto_save_frequency from ENUM to VARCHAR
ALTER TABLE core.goals 
    ALTER COLUMN auto_save_frequency TYPE VARCHAR(20) USING auto_save_frequency::text;

-- Convert goal_type from ENUM to VARCHAR  
ALTER TABLE core.goals 
    ALTER COLUMN goal_type TYPE VARCHAR(20) USING goal_type::text;

-- Convert priority from ENUM to VARCHAR (already VARCHAR but check)
-- Priority is already VARCHAR(20)

-- Convert status from ENUM to VARCHAR (already VARCHAR but check) 
-- Status is already VARCHAR(20)
