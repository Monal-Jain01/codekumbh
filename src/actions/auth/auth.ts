"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/schema/auth.schema";

// 1. LOGIN
export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  return redirect("/");
}

// 2. SIGNUP
export async function signup(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) return { error: error.message };

  return { success: "Check your email to verify your account." };
}

// 3. LOGOUT
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/auth/login");
}

// 4. FORGOT PASSWORD
export async function forgotPassword(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });
  if (error) return { error: error.message };

  return { success: "Password reset link sent to your email." };
}

// 5. UPDATE PASSWORD
export async function updatePassword(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  return redirect("/");
}