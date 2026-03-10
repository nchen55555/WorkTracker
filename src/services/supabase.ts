import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not found. Running in offline mode.\n" +
    "To enable persistence, create a .env file with:\n" +
    "  VITE_SUPABASE_URL=your-url\n" +
    "  VITE_SUPABASE_ANON_KEY=your-key"
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Database types
export interface DbTask {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMeeting {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  attendees: string[] | null;
  location: string | null;
  meeting_link: string | null;
  is_from_google: boolean;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  type: "task" | "meeting" | "reminder";
  color: string; // CategoryColor values: yellow, orange, coral, pink, purple, blue, teal, green, lime, gray
  sort_order: number;
  created_at: string;
}
