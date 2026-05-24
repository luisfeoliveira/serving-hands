import { createClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS entirely.
// Use ONLY in server-side code (Server Actions, Route Handlers).
// NEVER import this in a client component or any "use client" file.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
