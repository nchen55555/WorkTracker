-- Migration: Add google_calendar_id to categories table
-- This links categories to specific Google Calendars for auto-categorization during sync

-- Add the column
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_categories_google_calendar
ON public.categories(user_id, google_calendar_id)
WHERE google_calendar_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.categories.google_calendar_id IS 'Links this category to a Google Calendar ID for automatic event categorization during sync';
