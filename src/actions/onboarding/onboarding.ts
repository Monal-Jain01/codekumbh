"use server";

import { createClient } from "@/lib/supabase/server";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
} from "@/lib/schema/profile.schema";

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null };
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// Step 1: Save personal info
// ---------------------------------------------------------------------------

export async function saveOnboardingStep1(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = onboardingStep1Schema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    organization: formData.get("organization") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      organization: parsed.data.organization || null,
      onboarding_step: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 2: Save user type and investment preferences
// ---------------------------------------------------------------------------

export async function saveOnboardingStep2(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const rawBudget = formData.get("investment_budget");
  const parsed = onboardingStep2Schema.safeParse({
    investment_budget: rawBudget ? Number(rawBudget) : undefined,
    risk_tolerance: formData.get("risk_tolerance"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      investment_budget: parsed.data.investment_budget ?? null,
      risk_tolerance: parsed.data.risk_tolerance,
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 3: Complete onboarding
// ---------------------------------------------------------------------------

export async function completeOnboardingStep3(): Promise<
  { success: true } | { error: string }
> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_step: 3,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}
