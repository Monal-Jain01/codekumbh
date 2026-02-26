"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  portfolioId: string | null;
  userId: string;
  initialStatus: string;
}

/**
 * Invisible component that subscribes to realtime changes on the user's
 * portfolio row. When status flips to "ready" or "failed" it triggers a
 * server-side refresh so the page re-renders with the new AI data.
 */
export function PortfolioRealtimeListener({ portfolioId, userId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const refreshedRef = useRef(false);

  useEffect(() => {
    // Already in a terminal state — nothing to watch
    if (status === "ready" || status === "failed") return;

    const supabase = createClient();

    // Subscribe via Postgres changes on the portfolios table
    // We filter by user_id so we only get this user's updates
    const channel = supabase
      .channel(`portfolio-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolios",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRecord = payload.new as { status?: string } | undefined;
          const newStatus = newRecord?.status;

          if (!newStatus) return;
          setStatus(newStatus);

          if (
            (newStatus === "ready" || newStatus === "failed") &&
            !refreshedRef.current
          ) {
            refreshedRef.current = true;
            // Small delay so the DB write fully propagates before we re-fetch
            setTimeout(() => router.refresh(), 400);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, portfolioId, status, router]);

  // This component renders nothing — it's purely a side-effect listener
  return null;
}
