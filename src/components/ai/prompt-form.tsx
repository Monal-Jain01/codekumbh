"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPrompt } from "@/actions/ai";

type RunState = {
  runId: string;
  publicToken: string;
};

// ── Inner submit button — reads useFormStatus from its parent <form> ──
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Queuing task..." : "Generate with AI"}
    </Button>
  );
}

// ── Realtime result viewer ──
function RunResult({ runId, publicToken }: RunState) {
  const { run, error } = useRealtimeRun(runId, { accessToken: publicToken });

  if (error) return <p className="text-sm text-destructive">Error tracking run: {error.message}</p>;
  if (!run) return <p className="text-sm text-muted-foreground animate-pulse">Connecting to task…</p>;

  if (run.status === "COMPLETED") {
    const output = run.output as { text: string } | null;
    return (
      <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">
        {output?.text ?? "No output returned."}
      </div>
    );
  }

  if (run.status === "FAILED" || run.status === "CRASHED") {
    return <p className="text-sm text-destructive">Task failed. Check Trigger.dev dashboard.</p>;
  }

  return (
    <p className="text-sm text-muted-foreground animate-pulse">
      Running… (status: {run.status})
    </p>
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
    <div className="space-y-4">
      <form ref={formRef} action={handleAction} className="flex gap-2">
        <Input name="prompt" placeholder="Ask me anything…" required className="flex-1" />
        <SubmitButton />
      </form>

      {runState && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Run ID: {runState.runId}</p>
          <RunResult {...runState} />
        </div>
      )}
    </div>
  );
}
