"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  isGenerating: boolean;
}

/**
 * Banner shown while the portfolio is pending or generating.
 * When generating it shows a live elapsed timer so users know it's actively working.
 */
export function PortfolioGeneratingBanner({ isGenerating }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { clearInterval(interval); };
  }, [isGenerating]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  if (!isGenerating) {
    return (
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="flex items-center gap-3 py-6">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <p className="font-medium text-indigo-800">No portfolio yet</p>
            <p className="text-sm text-indigo-600 mt-0.5">
              List a property or click Regenerate to create your AI portfolio analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50">
      <CardContent className="py-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-indigo-800">
              Your AI portfolio is being generated…
            </p>
            <p className="text-sm text-indigo-600 mt-0.5">
              This usually takes 30–60 seconds. This page will update automatically — no need to refresh.
            </p>
          </div>
          {elapsed > 0 && (
            <span className="text-xs font-mono text-indigo-500 bg-indigo-100 px-2 py-1 rounded-md shrink-0">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>

        {/* Animated progress bar */}
        <div className="mt-4 h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min((elapsed / 90) * 100, 95)}%`,
            }}
          />
        </div>
        <p className="text-xs text-indigo-400 mt-1.5">
          Analysing market data, valuations, and risk profile…
        </p>
      </CardContent>
    </Card>
  );
}
