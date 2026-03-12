"use client";

import { useEffect } from "react";
import { Bot, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AgentsError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <Bot className="w-7 h-7 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">AI Agents unavailable</h1>
          <p className="text-muted-foreground text-sm">
            The AI agents couldn&apos;t be loaded right now. Please try again in a moment.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground/50">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
