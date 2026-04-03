-- Migration: Add api_keys table
-- Issue: #3

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_value VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_api_keys_updated_at') THEN
        CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
