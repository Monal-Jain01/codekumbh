import { z } from "zod";

// --- Update basic profile info ---
export const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  organization: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// --- Complete onboarding (investment preferences) ---
export const completeOnboardingSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  organization: z.string().max(100).optional().or(z.literal("")),
  investment_budget: z
    .number({ message: "Budget must be a number" })
    .positive("Budget must be greater than 0"),
  risk_tolerance: z.enum(["low", "medium", "high"] as const, {
    message: "Risk tolerance must be low, medium, or high",
  }),
});
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

// --- Update investment preferences only ---
export const updateInvestmentPreferencesSchema = z.object({
  investment_budget: z
    .number({ message: "Budget must be a number" })
    .positive("Budget must be greater than 0"),
  risk_tolerance: z.enum(["low", "medium", "high"] as const, {
    message: "Risk tolerance must be low, medium, or high",
  }),
});
export type UpdateInvestmentPreferencesInput = z.infer<
  typeof updateInvestmentPreferencesSchema
>;

// --- Avatar upload validation (client-side hint, not enforced server-side via FormData) ---
export const avatarUploadSchema = z.object({
  // file size in bytes
  size: z.number().max(5 * 1024 * 1024, "Avatar must be under 5 MB"),
  type: z
    .string()
    .refine(
      (t) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(t),
      "Only JPEG, PNG, WebP, or GIF images are allowed"
    ),
});
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;

// --- Onboarding step schemas (3-step wizard) ---

export const onboardingStep1Schema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-().]{7,20}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  organization: z.string().max(100).optional().or(z.literal("")),
});
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Schema>;

export const onboardingStep2Schema = z.object({
  investment_budget: z.number().positive("Budget must be greater than 0").optional(),
  risk_tolerance: z.enum(["low", "medium", "high"] as const, {
    message: "Risk tolerance must be low, medium, or high",
  }),
});
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Schema>;

// --- Shape of a profile row returned from DB ---
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  organization: z.string().nullable(),
  bio: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  user_type: z.string().nullable(),
  investment_budget: z.number().nullable(),
  risk_tolerance: z.enum(["low", "medium", "high"]).nullable(),
  onboarding_completed: z.boolean(),
  onboarding_step: z.number(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;
