-- Migration: Add end_date to meetings table
-- This supports multi-day events that span across multiple days

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.meetings.end_date IS 'End date for multi-day events. NULL for single-day events.';
