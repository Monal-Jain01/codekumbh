"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Generation } from "@/lib/schema";

type Props = {
  userId: string;
  initialGenerations: Generation[];
};

export function GenerationsHistory({ userId, initialGenerations }: Props) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("generations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT and UPDATE
          schema: "public",
          table: "generations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGenerations((prev) => [payload.new as Generation, ...prev].slice(0, 10));
          }

          if (payload.eventType === "UPDATE") {
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === (payload.new as Generation).id ? (payload.new as Generation) : g
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (generations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>
          Live-updated via Supabase Realtime. Showing your last {generations.length} generation(s).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generations.map((g) => (
          <div key={g.id} className="rounded-md border p-3 space-y-1 text-sm">
            <p className="font-medium">{g.prompt}</p>
            {g.status === "completed" && g.result ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{g.result}</p>
            ) : g.status === "failed" ? (
              <p className="text-xs text-destructive">Generation failed.</p>
            ) : (
              <p className="text-xs text-muted-foreground animate-pulse">Waiting for result…</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(g.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
