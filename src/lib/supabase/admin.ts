import { createClient } from "@supabase/supabase-js";

// Service-role client for use in Trigger.dev tasks (no Next.js cookie context).
// NEVER expose this to the browser. Server/task use only.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
