/**
 * Validates required environment variables at startup.
 * Import this in layout.tsx or any root server file so the app
 * crashes loudly with a clear message instead of a cryptic runtime error.
 *
 * Usage: import "@/lib/env";
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "TRIGGER_SECRET_KEY",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `\n\n🚨 Missing environment variables:\n\n  ${missing.join("\n  ")}\n\nAdd them to your .env.local file.\n`
  );
}
