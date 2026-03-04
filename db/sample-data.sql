-- Sample data for Flying Club API
-- All member passwords are: password123
-- Bcrypt hash (10 rounds): $2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu

-- Clear existing data (in reverse order of dependencies)
DELETE FROM billing_records;
DELETE FROM flight_logs;
DELETE FROM reservations;
DELETE FROM aircraft;
DELETE FROM members;

-- Reset sequences
ALTER SEQUENCE members_id_seq RESTART WITH 1;
ALTER SEQUENCE aircraft_id_seq RESTART WITH 1;
ALTER SEQUENCE reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE flight_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE billing_records_id_seq RESTART WITH 1;

-- Insert sample members with hashed passwords
-- Password for all users: password123
INSERT INTO members (member_number, first_name, last_name, email, phone, password, role) VALUES
('M001', 'John', 'Doe', 'john.doe@example.com', '555-0100', '$2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu', 'admin'),
('M002', 'Jane', 'Smith', 'jane.smith@example.com', '555-0101', '$2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu', 'operator'),
('M003', 'Bob', 'Johnson', 'bob.johnson@example.com', '555-0102', '$2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu', 'member'),
('M004', 'Alice', 'Williams', 'alice.williams@example.com', '555-0103', '$2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu', 'member'),
('M005', 'Charlie', 'Brown', 'charlie.brown@example.com', '555-0104', '$2b$10$koXfd/BvYx1dUgbFslSKq.EprkQZ8TzGa1bJsZMzaMWISv3V2vgYu', 'member');

-- Insert sample aircraft
INSERT INTO aircraft (tail_number, make, model, year, hourly_rate, current_tach_hours) VALUES
('N12345', 'Cessna', '172S', 2018, 135.00, 2450.5),
('N67890', 'Piper', 'PA-28-181', 2015, 125.00, 3215.2),
('N24680', 'Cessna', '182T', 2020, 165.00, 1523.8),
('N13579', 'Diamond', 'DA40', 2019, 155.00, 892.3);

-- Insert sample reservations
-- Some in the past (for completed flights), some current, some future
INSERT INTO reservations (member_id, aircraft_id, start_time, end_time, status, notes) VALUES
-- Past reservations (completed)
(1, 1, '2024-03-01 09:00:00', '2024-03-01 12:00:00', 'completed', 'Local flight practice'),
(2, 2, '2024-03-02 14:00:00', '2024-03-02 17:00:00', 'completed', 'Cross-country to KPAE'),
(3, 3, '2024-03-03 10:00:00', '2024-03-03 13:00:00', 'completed', 'IFR training'),
(1, 4, '2024-03-05 08:00:00', '2024-03-05 11:00:00', 'completed', 'Breakfast run'),
(4, 1, '2024-03-07 15:00:00', '2024-03-07 18:00:00', 'completed', 'Touch and goes'),

-- Current/upcoming reservations
(5, 2, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '3 hours', 'scheduled', 'Sightseeing flight'),
(2, 3, CURRENT_TIMESTAMP + INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '2 hours', 'scheduled', 'Instrument practice'),
(3, 4, CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '4 hours', 'scheduled', 'Long cross-country'),
(1, 1, CURRENT_TIMESTAMP + INTERVAL '5 days', CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours', 'scheduled', 'Currency flight'),

-- Cancelled reservation
(4, 2, '2024-03-04 11:00:00', '2024-03-04 14:00:00', 'cancelled', 'Weather cancellation');

-- Insert sample flight logs (for completed reservations)
INSERT INTO flight_logs (reservation_id, member_id, aircraft_id, tach_start, tach_end, flight_date, departure_time, arrival_time) VALUES
(1, 1, 1, 2450.5, 2452.8, '2024-03-01', '2024-03-01 09:15:00', '2024-03-01 11:45:00'),
(2, 2, 2, 3215.2, 3218.5, '2024-03-02', '2024-03-02 14:10:00', '2024-03-02 16:50:00'),
(3, 3, 3, 1523.8, 1526.9, '2024-03-03', '2024-03-03 10:05:00', '2024-03-03 12:55:00'),
(4, 1, 4, 892.3, 894.1, '2024-03-05', '2024-03-05 08:20:00', '2024-03-05 10:50:00'),
(5, 4, 1, 2452.8, 2455.3, '2024-03-07', '2024-03-07 15:10:00', '2024-03-07 17:40:00');

-- Insert sample billing records (generated from flight logs)
INSERT INTO billing_records (member_id, flight_log_id, aircraft_id, tach_hours, hourly_rate, amount, billing_date, is_paid, payment_date) VALUES
-- Paid bills
(1, 1, 1, 2.3, 135.00, 310.50, '2024-03-01', true, '2024-03-05'),
(2, 2, 2, 3.3, 125.00, 412.50, '2024-03-02', true, '2024-03-08'),
(3, 3, 3, 3.1, 165.00, 511.50, '2024-03-03', true, '2024-03-10'),

-- Unpaid bills
(1, 4, 4, 1.8, 155.00, 279.00, '2024-03-05', false, NULL),
(4, 5, 1, 2.5, 135.00, 337.50, '2024-03-07', false, NULL);

-- Display summary
SELECT 'Data insertion complete!' as message;
SELECT COUNT(*) as member_count FROM members;
SELECT COUNT(*) as aircraft_count FROM aircraft;
SELECT COUNT(*) as reservation_count FROM reservations;
SELECT COUNT(*) as flight_log_count FROM flight_logs;
SELECT COUNT(*) as billing_record_count FROM billing_records;
