import { createClient } from "@supabase/supabase-js";

// TODO(emea): replace with the EMEA Supabase project URL + anon key
// before deploying. Anon keys are safe for public use when paired with
// row-level security on the Supabase project.
export const SUPABASE_URL = "https://YOUR-EMEA-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_EMEA_SUPABASE_ANON_KEY";

export const TABLES = {
  USERS: "step_tracker_users",
  STEPS: "daily_steps",
  ACTIVITIES: "recent_activities",
  ADMIN_USERS: "admin_users",
} as const;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
