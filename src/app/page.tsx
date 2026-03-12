import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptForm } from "@/components/ai/prompt-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { GenerationsHistory } from "@/components/ai/generations-history";
import type { Generation } from "@/lib/schema";
import { PropertySearch } from "@/components/property-search";
import { NewlyLaunched } from "@/components/newly-launched";


export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Hello World</h1>
          <p className="text-muted-foreground">Welcome to the Hackathon Starter. Please log in to continue.</p>
          <Button asChild>
            <Link href="/auth/login">Log In</Link>
          </Button>
        </div>
        <PropertySearch />
        <NewlyLaunched />
      </div>
    );
  }

  // Fetch the last 10 generations for this user
  const { data: generations } = await supabase
    .from("generations")
    .select("id, prompt, result, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex mt-10 flex-col items-center justify-center p-4 gap-8">
      {/* Property Search Bar */}
      <PropertySearch />
      {/* Newly Launched Projects */}
      <NewlyLaunched />

      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        {/* <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <LogoutButton />
        </div> */}


        {/* History — live via Supabase Realtime */}
        <GenerationsHistory
          userId={user.id}
          initialGenerations={(generations ?? []) as Generation[]}
        />
      </div>
    </div>
  );
}
