-- Add is_archived column to tasks and reminders tables
-- This allows users to archive items without deleting them

-- Add is_archived to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add is_archived to reminders (notes)
ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add indexes for filtering archived items
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_reminders_archived ON public.reminders(user_id, is_archived);
