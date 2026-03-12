"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Terminal } from "lucide-react";
import { submitPrompt } from "@/actions/ai";

type RunState = {
  runId: string;
  publicToken: string;
};

// ── Inner submit button — reads useFormStatus from its parent <form> ──
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      disabled={pending} 
      className="min-w-[140px] transition-all"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Queuing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate
        </>
      )}
    </Button>
  );
}

// ── Realtime result viewer ──
function RunResult({ runId, publicToken }: RunState) {
  const { run, error } = useRealtimeRun(runId, { accessToken: publicToken });

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
        Error tracking run: {error.message}
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting to task…
      </div>
    );
  }

  if (run.status === "COMPLETED") {
    const output = run.output as { text: string } | null;
    return (
      <div className="relative rounded-lg border bg-card p-4 text-sm text-card-foreground shadow-sm whitespace-pre-wrap leading-relaxed">
        {output?.text ?? "No output returned."}
      </div>
    );
  }

  if (run.status === "FAILED" || run.status === "CRASHED") {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
        Task failed. Check Trigger.dev dashboard.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Processing AI response...
      </div>
      <span className="text-xs font-medium uppercase bg-muted px-2 py-1 rounded-full">
        {run.status}
      </span>
    </div>
  );
}

// ── Main form component ──
export function PromptForm() {
  const [runState, setRunState] = useState<RunState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    const result = await submitPrompt(formData);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Task queued! Waiting for AI response…");
    setRunState({ runId: result.runId!, publicToken: result.publicToken! });
    formRef.current?.reset();
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <form ref={formRef} action={handleAction} className="flex flex-col sm:flex-row gap-3">
        <Input 
          name="prompt" 
          placeholder="Ask the AI agent anything…" 
          required 
          className="flex-1 shadow-sm focus-visible:ring-primary"
          autoComplete="off"
        />
        <SubmitButton />
      </form>

      {runState && (
        <div className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-1">
            <Terminal className="h-3 w-3" />
            Run ID: <span className="font-mono">{runState.runId}</span>
          </div>
          <RunResult {...runState} />
        </div>
      )}
    </div>
  );
}