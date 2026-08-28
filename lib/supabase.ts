import { createClient } from "@supabase/supabase-js";

// Client-side Supabase instance — uses the public anon key, safe to expose.
// RLS policies (see supabase/schema.sql) control what this can actually read/write.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
