"use server";

import { tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { generatePortfolio } from "@/trigger/generate-portfolio";

export async function regeneratePortfolio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  try {
    await tasks.trigger<typeof generatePortfolio>("generate-portfolio", {
      userId: user.id,
      trigger: "manual",
    });
  } catch (err) {
    console.error("Failed to trigger portfolio regeneration:", err);
  }

  redirect("/dashboard/portfolio");
}
