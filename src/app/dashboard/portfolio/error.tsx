"use client";

import { useEffect } from "react";
import { BarChart3, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PortfolioError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
          <BarChart3 className="w-7 h-7 text-indigo-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Portfolio unavailable</h1>
          <p className="text-gray-500 text-sm">
            We couldn&apos;t load your AI portfolio right now. Your data is safe — please try again.
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-400">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
