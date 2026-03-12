import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Use at the top of any protected server page.
 * - Not logged in   → redirects to /auth/login
 * - Not onboarded   → redirects to /onboarding
 * - Onboarded       → returns { supabase, user }
 */
export async function requireOnboarded() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return { supabase, user };
}
