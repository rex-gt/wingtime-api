-- Migration: Add is_archived column to aircraft table
-- Issue: #52

-- 1. Add the column with a default of FALSE
-- Using IF NOT EXISTS makes the script idempotent (runnable multiple times safely)
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Ensure all existing rows have the default value (PostgreSQL 11+ does this automatically with DEFAULT)
-- But we can explicitly update if we want to be 100% sure or if the column already existed without data.
UPDATE aircraft SET is_archived = FALSE WHERE is_archived IS NULL;

-- 3. Verify the change (optional, just for logging in psql)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='aircraft' AND column_name='is_archived'
    ) THEN
        RAISE NOTICE '✓ Column is_archived successfully added to aircraft table.';
    ELSE
        RAISE EXCEPTION '❌ Column is_archived was not added.';
    END IF;
END $$;
