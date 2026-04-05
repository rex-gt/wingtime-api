-- Migration: Add squawks and squawk_comments tables
-- Issue: #2

CREATE TABLE IF NOT EXISTS squawks (
    id SERIAL PRIMARY KEY,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Urgent', 'Approved Grounding')),
    description TEXT NOT NULL,
    observed_date DATE NOT NULL,
    created_by INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS squawk_comments (
    id SERIAL PRIMARY KEY,
    squawk_id INTEGER NOT NULL REFERENCES squawks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_squawks_updated_at') THEN
        CREATE TRIGGER update_squawks_updated_at BEFORE UPDATE ON squawks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
