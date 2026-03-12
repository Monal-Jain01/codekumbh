"use server";

import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  completeOnboardingSchema,
  updateInvestmentPreferencesSchema,
  avatarUploadSchema,
  type Profile,
} from "@/lib/schema/profile.schema";
import {
  uploadFile,
  deleteFile,
  extractStoragePath,
} from "@/lib/supabase/storage";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Internal helper: resolve the authenticated user or return an error
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
// 1. GET PROFILE
// ---------------------------------------------------------------------------

/**
 * Fetch the profile row for the currently authenticated user.
 * Returns `{ data: Profile }` on success or `{ error: string }` on failure.
 */
export async function getProfile(): Promise<
  { data: Profile } | { error: string }
> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return { error: error.message };
  return { data: data as Profile };
}

// ---------------------------------------------------------------------------
// 2. UPDATE PROFILE (basic info)
// ---------------------------------------------------------------------------

/**
 * Update the authenticated user's name, phone, organization, and bio.
 * Accepts a `FormData` object from a form submission.
 */
export async function updateProfile(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    organization: formData.get("organization") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      organization: parsed.data.organization || null,
      bio: parsed.data.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. UPDATE INVESTMENT PREFERENCES
// ---------------------------------------------------------------------------

/**
 * Update only the investment-related fields: budget and risk tolerance.
 */
export async function updateInvestmentPreferences(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = updateInvestmentPreferencesSchema.safeParse({
    investment_budget: Number(formData.get("investment_budget")),
    risk_tolerance: formData.get("risk_tolerance"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      investment_budget: parsed.data.investment_budget,
      risk_tolerance: parsed.data.risk_tolerance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. COMPLETE ONBOARDING
// ---------------------------------------------------------------------------

/**
 * Called once after first sign-up to fill in the user's name, phone,
 * organization, budget, and risk tolerance, then flip `onboarding_completed`.
 */
export async function completeOnboarding(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = completeOnboardingSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    organization: formData.get("organization") ?? "",
    investment_budget: Number(formData.get("investment_budget")),
    risk_tolerance: formData.get("risk_tolerance"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      organization: parsed.data.organization || null,
      investment_budget: parsed.data.investment_budget,
      risk_tolerance: parsed.data.risk_tolerance,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };

  // Fire-and-forget: generate AI portfolio baseline after onboarding
  void (async () => {
    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      const { generatePortfolio } = await import("@/trigger/generate-portfolio");
      await tasks.trigger<typeof generatePortfolio>("generate-portfolio", {
        userId,
        trigger: "onboarding",
      });
    } catch (err) {
      console.error("Failed to trigger portfolio generation after onboarding:", err);
    }
  })();

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. UPLOAD AVATAR
// ---------------------------------------------------------------------------

/**
 * Upload a new avatar image for the authenticated user.
 * - Validates file type and size (≤ 5 MB, image/* only).
 * - Deletes the previous avatar from storage if one exists.
 * - Inserts/updates `avatar_url` on the profile row.
 *
 * Expects `formData.get("avatar")` to be a `File`.
 */
export async function uploadAvatar(
  formData: FormData
): Promise<{ avatarUrl: string } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "No file provided" };

  // Validate metadata
  const metaCheck = avatarUploadSchema.safeParse({
    size: file.size,
    type: file.type,
  });
  if (!metaCheck.success) return { error: metaCheck.error.issues[0].message };

  try {
    // Fetch current avatar_url to allow removing the old file
    const { data: existing } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    // Delete old avatar file if it lives in our bucket
    if (existing?.avatar_url) {
      try {
        const oldPath = extractStoragePath(existing.avatar_url, "avatars");
        await deleteFile(supabaseAdmin, "avatars", oldPath);
      } catch {
        // Non-fatal: old file may have already been deleted or belong to a
        // different bucket. Continue with the upload.
      }
    }

    // Upload new file under a per-user folder so paths are always unique
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${userId}/avatar_${Date.now()}.${ext}`;

    const { publicUrl } = await uploadFile(supabaseAdmin, file, {
      bucket: "avatars",
      path: storagePath,
      upsert: true,
    });

    // Persist URL to profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) return { error: updateError.message };

    return { avatarUrl: publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Avatar upload failed";
    return { error: message };
  }
}

// ---------------------------------------------------------------------------
// 6. DELETE AVATAR
// ---------------------------------------------------------------------------

/**
 * Remove the authenticated user's avatar from storage and clear `avatar_url`
 * on the profile row.
 */
export async function deleteAvatar(): Promise<
  { success: true } | { error: string }
> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  if (existing?.avatar_url) {
    try {
      const path = extractStoragePath(existing.avatar_url, "avatars");
      await deleteFile(supabaseAdmin, "avatars", path);
    } catch {
      // Non-fatal — clear the DB record regardless
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}
