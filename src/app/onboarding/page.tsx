import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { Profile } from "@/lib/schema/profile.schema";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch or create profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        phone: user.user_metadata?.phone ?? null,
        organization: null,
        investment_budget: null,
        risk_tolerance: null,
        onboarding_completed: false,
        onboarding_step: 0,
      })
      .select("*")
      .single();
    profile = newProfile;
  }

  // If profile still null (upsert failed / RLS), create a fallback object
  if (!profile) {
    profile = {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      phone: user.user_metadata?.phone ?? null,
      organization: null,
      bio: null,
      avatar_url: null,
      user_type: "buyer",
      investment_budget: null,
      risk_tolerance: null,
      onboarding_completed: false,
      onboarding_step: 0,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
  }

  // Already completed → send home
  if (profile?.onboarding_completed) {
    redirect("/");
  }

  return <OnboardingWizard profile={profile as Profile} />;
}
