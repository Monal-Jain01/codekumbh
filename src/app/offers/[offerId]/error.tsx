"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OfferDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OfferDetailError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Offer not found</h1>
          <p className="text-gray-500 text-sm">
            This offer doesn&apos;t exist, has been removed, or you don&apos;t have permission to view it.
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
            href="/dashboard/offers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My Offers
          </Link>
        </div>
      </div>
    </div>
  );
}
