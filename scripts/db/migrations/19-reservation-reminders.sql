-- Migration: Add reminder settings and tracking
-- Issue: #19

-- Add reminder_hours to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS reminder_hours INTEGER DEFAULT 24;

-- Add reminder_sent to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
