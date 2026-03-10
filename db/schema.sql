-- Flying Club Scheduling System Database Schema

-- Members table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    member_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL, -- Store hashed passwords
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'operator', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Aircraft table
CREATE TABLE aircraft (
    id SERIAL PRIMARY KEY,
    tail_number VARCHAR(10) UNIQUE NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    current_tach_hours DECIMAL(10, 2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Flight logs table (tracks actual usage and tach hours)
CREATE TABLE flight_logs (
    id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    tach_start DECIMAL(10, 2) NOT NULL,
    tach_end DECIMAL(10, 2),
    tach_hours DECIMAL(10, 2) GENERATED ALWAYS AS (tach_end - tach_start) STORED,
    flight_date DATE NOT NULL,
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_tach_range CHECK (tach_end IS NULL OR tach_end >= tach_start)
);

-- Billing records table
CREATE TABLE billing_records (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    flight_log_id INTEGER NOT NULL REFERENCES flight_logs(id) ON DELETE CASCADE,
    aircraft_id INTEGER NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    tach_hours DECIMAL(10, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    billing_date DATE DEFAULT CURRENT_DATE,
    is_paid BOOLEAN DEFAULT false,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_reservations_member ON reservations(member_id);
CREATE INDEX idx_reservations_aircraft ON reservations(aircraft_id);
CREATE INDEX idx_reservations_time ON reservations(start_time, end_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_flight_logs_member ON flight_logs(member_id);
CREATE INDEX idx_flight_logs_aircraft ON flight_logs(aircraft_id);
CREATE INDEX idx_flight_logs_date ON flight_logs(flight_date);
CREATE INDEX idx_billing_records_member ON billing_records(member_id);
CREATE INDEX idx_billing_records_paid ON billing_records(is_paid);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aircraft_updated_at BEFORE UPDATE ON aircraft
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_logs_updated_at BEFORE UPDATE ON flight_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at BEFORE UPDATE ON billing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
