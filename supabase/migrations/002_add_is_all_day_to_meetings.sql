-- Migration: Add is_all_day to meetings table
-- This distinguishes all-day events from timed events synced from Google Calendar

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.meetings.is_all_day IS 'True for all-day events (no specific time), false for events with specific start/end times';
