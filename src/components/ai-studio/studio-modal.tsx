"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Columns2, X, CheckCircle2,
  Wand2, Undo2, ChevronRight, Check, LayoutGrid, Zap, Type, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { StudioPhoto, StudioTool } from "./types";
import { STAGE_PRESETS, LAYOUT_PRESETS, ENHANCE_PRESETS } from "./constants";
import { processImageWithAI } from "@/actions/ai-studio/process-image";

interface AIStudioProps {
  photo: StudioPhoto;
  onClose: () => void;
  onApply: (id: string, tool: StudioTool, preset?: string, outputUrl?: string) => void;
}

const MOCK_STEPS: Record<StudioTool, string[]> = {
  stage:    ["Analysing room layout", "Generating style transfer", "Refining details"],
  objects:  ["Detecting object bounds", "Matching replacement item", "Compositing scene"],
  organise: ["Analysing room dimensions", "Planning optimal layout", "Rendering placement"],
  enhance:  ["Analysing lighting conditions", "Calibrating colour balance", "Applying enhancement"],
  compare:  [],
};

const LIVE_STEPS: Record<StudioTool, string[]> = {
  stage:    ["Encoding image", "Transferring style via Stability AI", "Decoding result"],
  objects:  ["Encoding image", "Running object removal & placement", "Compositing result"],
  organise: ["Encoding image", "Rearranging layout with AI", "Rendering scene"],
  enhance:  ["Encoding image", "Applying quality enhancement", "Finalising output"],
  compare:  [],
};

/* Convert any URL (blob: or https:) to base64 data URI */
async function toBase64(url: string): Promise<string> {
  const res  = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
}

export function AIStudio({ photo, onClose, onApply }: AIStudioProps) {
  /* ── AI Mode (persisted) ──────────────────────────────────────────────── */
  const [aiMode, setAiMode] = useState<"demo" | "live">("demo");
  useEffect(() => {
    const stored = localStorage.getItem("estator-ai-mode");
    if (stored === "live") setAiMode("live");
  }, []);
  const toggleMode = useCallback(() => {
    setAiMode(prev => {
      const next = prev === "demo" ? "live" : "demo";
      localStorage.setItem("estator-ai-mode", next);
      return next;
    });
  }, []);

  /* ── Tool state ───────────────────────────────────────────────────────── */
  const [tool, setTool] = useState<StudioTool>("stage");

  const [preset,        setPreset]        = useState<string | null>(
    photo.applied?.tool === "stage" ? (photo.applied.preset ?? null) : null,
  );
  const [replaceText,     setReplaceText]     = useState("");
  const [replaceWithText, setReplaceWithText] = useState("");
  const [layoutPreset,  setLayoutPreset]  = useState<string | null>(null);
  const [enhancePreset, setEnhancePreset] = useState<string | null>(
    photo.applied?.tool === "enhance" ? (photo.applied.preset ?? null) : null,
  );

  /* ── Processing state ─────────────────────────────────────────────────── */
  const [processing, setProcessing] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const [done,       setDone]       = useState(!!photo.applied);
  const [outputUrl,  setOutputUrl]  = useState<string | null>(null); // AI result

  const [sliderPos, setSliderPos] = useState(50);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const activePreset  = STAGE_PRESETS.find(p => p.id === preset);
  const activeLayout  = LAYOUT_PRESETS.find(l => l.id === layoutPreset);
  const activeEnhance = ENHANCE_PRESETS.find(e => e.id === enhancePreset);

  /* CSS filter — only in demo mode (real mode shows actual AI output) */
  const cssFilter = !outputUrl && done
    ? tool === "stage"   && activePreset  ? activePreset.filter
    : tool === "enhance" && activeEnhance ? activeEnhance.filter
    : tool === "organise"                 ? "brightness-103 saturate-105"
    : ""
    : "";

  /* ── Apply ────────────────────────────────────────────────────────────── */
  function validate(): boolean {
    if (tool === "stage"    && !preset)                { toast.error("Select a style"); return false; }
    if (tool === "objects"  && !replaceText.trim())    { toast.error("Describe the object to remove"); return false; }
    if (tool === "objects"  && !replaceWithText.trim()){ toast.error("Describe the replacement"); return false; }
    if (tool === "organise" && !layoutPreset)          { toast.error("Select a layout"); return false; }
    if (tool === "enhance"  && !enhancePreset)         { toast.error("Select an enhancement"); return false; }
    return true;
  }

  async function handleApply() {
    if (!validate()) return;
    setProcessing(true);
    setDone(false);
    setOutputUrl(null);

    if (aiMode === "live") {
      /* ── Real API ── */
      try {
        setLiveStatus("Converting image…");
        const base64 = await toBase64(photo.url);

        setLiveStatus("Sending to Stability AI…");
        const result = await processImageWithAI({
          imageBase64: base64,
          tool,
          preset:      preset ?? layoutPreset ?? enhancePreset ?? undefined,
          removeText:  replaceText.trim()     || undefined,
          replaceText: replaceWithText.trim() || undefined,
        });

        if (!result.success) {
          toast.error(`AI error: ${result.error}`);
          setProcessing(false);
          return;
        }

        setLiveStatus("Done!");
        setOutputUrl(result.outputBase64);
        setDone(true);
        setProcessing(false);
        onApply(photo.id, tool, preset ?? layoutPreset ?? enhancePreset ?? undefined, result.outputBase64);
      } catch (err) {
        toast.error(`Failed: ${String(err)}`);
        setProcessing(false);
      }
    } else {
      /* ── Demo mock ── */
      setTimeout(() => {
        setProcessing(false);
        setDone(true);
        onApply(photo.id, tool, preset ?? layoutPreset ?? enhancePreset ?? undefined);
      }, 2800);
    }
  }

  function handleReset() {
    setDone(false);
    setOutputUrl(null);
    setPreset(null);
    setReplaceText("");
    setReplaceWithText("");
    setLayoutPreset(null);
    setEnhancePreset(null);
  }

  const steps = aiMode === "live" ? LIVE_STEPS[tool] : MOCK_STEPS[tool];

  /* ── JSX ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Wand2 size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">AI Image Studio</p>
              <p className="text-[11px] text-muted-foreground truncate">{photo.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ── Demo / Live toggle ── */}
            <button
              onClick={toggleMode}
              title={aiMode === "live" ? "Live AI — click to switch to Demo" : "Demo mode — click to enable Live AI"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all",
                aiMode === "live"
                  ? "bg-violet-600 text-white border-violet-700 shadow-md shadow-violet-500/30"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              {aiMode === "live"
                ? <><Wifi size={10} /> Live AI</>
                : <><WifiOff size={10} /> Demo</>}
            </button>

            {done && (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors">
                <Undo2 size={12} /> Reset
              </button>
            )}
            <Button size="sm" onClick={handleApply} disabled={processing || tool === "compare"}>
              {processing
                ? <Loader2 size={13} className="animate-spin mr-1.5" />
                : <Sparkles size={13} className="mr-1.5" />}
              {done ? "Re-apply" : aiMode === "live" ? "Apply with AI" : "Apply"}
            </Button>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Canvas */}
          <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden">
            <div className={cn("relative w-full h-full transition-all duration-700", !outputUrl ? cssFilter : "")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {outputUrl
                /* base64 output from real API — use regular <img> since Image component can't handle arbitrary base64 */
                ? <img src={outputUrl} alt="AI output" className="w-full h-full object-contain" />
                : <Image src={photo.url} alt="Studio photo" fill className="object-contain" sizes="800px" unoptimized />
              }
            </div>

            {/* Compare overlay */}
            {tool === "compare" && (
              <div className="absolute inset-0">
                <div className="absolute inset-0">
                  <Image src={photo.url} alt="After" fill unoptimized
                    className="object-contain brightness-110 saturate-125 contrast-105" sizes="800px" />
                  <div className="absolute bottom-4 right-4 bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">AFTER</div>
                </div>
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                  <div className="absolute inset-0" style={{ width: `${10000 / sliderPos}%` }}>
                    <Image src={photo.url} alt="Before" fill unoptimized className="object-contain" sizes="800px" />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">BEFORE</div>
                </div>
                <div className="absolute top-0 bottom-0 flex items-center justify-center z-10 pointer-events-none"
                  style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}>
                  <div className="w-0.5 h-full bg-white/80" />
                  <div className="absolute w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center">
                    <Columns2 size={15} className="text-slate-700" />
                  </div>
                </div>
                <input type="range" min={3} max={97} value={sliderPos}
                  onChange={e => setSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20" />
              </div>
            )}

            {/* Processing overlay */}
            {processing && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-500/30" />
                  <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                  <Wand2 size={18} className="absolute inset-0 m-auto text-violet-400" />
                </div>
                <div className="text-center space-y-1.5 px-6">
                  {aiMode === "live" ? (
                    <>
                      <p className="text-sm font-semibold text-white">{liveStatus || "Connecting…"}</p>
                      <p className="text-[11px] text-white/50">Stability AI — this may take 10–30 seconds</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">
                        {tool === "stage"    ? `Applying ${activePreset?.label} style…`
                         : tool === "objects"  ? `Replacing "${replaceText}"…`
                         : tool === "organise" ? `Applying ${activeLayout?.label} layout…`
                         : tool === "enhance"  ? `Enhancing with ${activeEnhance?.label}…`
                         : "Processing…"}
                      </p>
                      <div className="flex flex-col gap-1 items-center">
                        {steps.map((s, i) => (
                          <p key={i} className="text-[11px] text-white/60 flex items-center gap-1.5">
                            <Loader2 size={9} className="animate-spin" /> {s}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Applied badge */}
            {done && !processing && (
              <div className={cn(
                "absolute top-3 left-3 flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-full z-10",
                aiMode === "live" && outputUrl
                  ? "bg-violet-600/90"
                  : "bg-emerald-500/90",
              )}>
                <CheckCircle2 size={12} />
                {aiMode === "live" && outputUrl ? "AI Processed" : "Preview Applied"}
              </div>
            )}

            {!processing && !done && tool !== "compare" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white/70 text-[11px] px-3 py-1.5 rounded-full z-10 whitespace-nowrap pointer-events-none">
                Configure on the right → click {aiMode === "live" ? "Apply with AI" : "Apply"}
              </div>
            )}
          </div>

          {/* ── Tools Panel ────────────────────────────────────────────── */}
          <div className="w-64 xl:w-72 shrink-0 border-l border-border flex flex-col overflow-hidden bg-card">

            {/* Live mode banner */}
            {aiMode === "live" && (
              <div className="bg-violet-600/10 border-b border-violet-500/20 px-3 py-2 flex items-center gap-2">
                <Wifi size={11} className="text-violet-500 shrink-0" />
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                  Live AI enabled — real results via Stability AI
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {([
                { id: "stage",    icon: Sparkles,   label: "Stage"    },
                { id: "objects",  icon: Type,       label: "Objects"  },
                { id: "organise", icon: LayoutGrid, label: "Organise" },
                { id: "enhance",  icon: Zap,        label: "Enhance"  },
                { id: "compare",  icon: Columns2,   label: "Compare"  },
              ] as { id: StudioTool; icon: React.ElementType; label: string }[]).map(t => (
                <button key={t.id} onClick={() => setTool(t.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors border-b-2",
                    tool === t.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}>
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {/* ── Stage ─────────────────────────────────────────────── */}
              {tool === "stage" && (<>
                <p className="text-[11px] text-muted-foreground px-1">
                  {aiMode === "live"
                    ? "AI will re-stage this room in the chosen style."
                    : "Choose a style to virtually stage this room."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STAGE_PRESETS.map(p => (
                    <button key={p.id} onClick={() => setPreset(p.id)}
                      className={cn(
                        "flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left",
                        preset === p.id ? "border-primary shadow-md shadow-primary/20" : "border-border hover:border-primary/40",
                      )}>
                      <div className={cn("h-10 w-full bg-gradient-to-br relative", p.from, p.to)}>
                        {preset === p.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={14} className="text-white drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[11px] font-semibold text-foreground leading-none">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>)}

              {/* ── Objects ───────────────────────────────────────────── */}
              {tool === "objects" && (<>
                <p className="text-[11px] text-muted-foreground px-1">
                  {aiMode === "live"
                    ? "AI will remove the object and place your chosen replacement."
                    : "Describe the object to remove and what should replace it."}
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 flex items-center justify-center text-[9px] font-bold">1</span>
                    Object to Remove
                  </label>
                  <textarea rows={2} value={replaceText} onChange={e => setReplaceText(e.target.value)}
                    placeholder="e.g. old wooden sofa in the corner, damaged ceiling fan…"
                    className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">2</span>
                    Replace With
                  </label>
                  <textarea rows={2} value={replaceWithText} onChange={e => setReplaceWithText(e.target.value)}
                    placeholder="e.g. modern L-shaped sectional in charcoal grey, LED chandelier…"
                    className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                </div>

                {replaceText.trim() && replaceWithText.trim() && (
                  <div className="rounded-xl border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      <span className="font-semibold">Remove:</span> {replaceText.trim()}
                      <span className="mx-1 text-emerald-400">→</span>
                      <span className="font-semibold">Add:</span> {replaceWithText.trim()}
                    </p>
                  </div>
                )}
              </>)}

              {/* ── Organise ──────────────────────────────────────────── */}
              {tool === "organise" && (<>
                <p className="text-[11px] text-muted-foreground px-1">
                  {aiMode === "live"
                    ? "AI will rearrange the furniture for the chosen layout."
                    : "Pick a layout. AI will rearrange furniture for optimal space use."}
                </p>
                <div className="space-y-1.5">
                  {LAYOUT_PRESETS.map(l => (
                    <button key={l.id} onClick={() => setLayoutPreset(l.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                        layoutPreset === l.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent",
                      )}>
                      <span className="text-xl leading-none shrink-0">{l.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold", layoutPreset === l.id ? "text-primary" : "text-foreground")}>{l.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{l.desc}</p>
                      </div>
                      {layoutPreset === l.id ? <Check size={13} className="text-primary shrink-0" /> : <ChevronRight size={13} className="text-muted-foreground shrink-0" />}
                    </button>
                  ))}
                </div>
              </>)}

              {/* ── Enhance ───────────────────────────────────────────── */}
              {tool === "enhance" && (<>
                <p className="text-[11px] text-muted-foreground px-1">
                  {aiMode === "live"
                    ? "AI will enhance this photo with the selected quality profile."
                    : "Apply an AI enhancement profile to improve visual appeal."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ENHANCE_PRESETS.map(e => (
                    <button key={e.id} onClick={() => setEnhancePreset(e.id)}
                      className={cn(
                        "flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left",
                        enhancePreset === e.id ? "border-primary shadow-md shadow-primary/20" : "border-border hover:border-primary/40",
                      )}>
                      <div className={cn("h-8 w-full bg-gradient-to-r from-amber-200 via-sky-200 to-emerald-200 relative", e.filter)}>
                        {enhancePreset === e.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                            <Check size={12} className="text-primary drop-shadow" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[11px] font-semibold text-foreground leading-none">{e.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{e.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>)}

              {/* ── Compare ───────────────────────────────────────────── */}
              {tool === "compare" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground px-1">Drag the divider to compare original vs enhanced.</p>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <Columns2 size={12} className="text-emerald-500" /> Comparison Active
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Left → <strong>original</strong>. Right → <strong>enhanced</strong>.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground px-1">
                      <span>Before</span>
                      <span className="font-medium text-foreground">{sliderPos}%</span>
                      <span>After</span>
                    </div>
                    <input type="range" min={3} max={97} value={sliderPos}
                      onChange={e => setSliderPos(Number(e.target.value))}
                      className="w-full accent-primary" />
                  </div>
                </div>
              )}

              {/* ── Result note ───────────────────────────────────────── */}
              {done && !processing && (
                <div className={cn(
                  "rounded-xl border p-3 space-y-1",
                  aiMode === "live" && outputUrl
                    ? "border-violet-500/30 bg-violet-50 dark:bg-violet-900/20"
                    : "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20",
                )}>
                  <p className={cn(
                    "text-[11px] font-semibold flex items-center gap-1.5",
                    aiMode === "live" && outputUrl
                      ? "text-violet-700 dark:text-violet-400"
                      : "text-emerald-700 dark:text-emerald-400",
                  )}>
                    <CheckCircle2 size={11} />
                    {aiMode === "live" && outputUrl ? "AI result ready" : "Preview applied"}
                  </p>
                  <p className={cn(
                    "text-[11px]",
                    aiMode === "live" && outputUrl
                      ? "text-violet-600/80 dark:text-violet-300/70"
                      : "text-emerald-600/80 dark:text-emerald-300/70",
                  )}>
                    {aiMode === "live" && outputUrl
                      ? "Real AI output shown in canvas. Save to keep."
                      : tool === "stage"    ? `${activePreset?.label} style preview.`
                      : tool === "objects"  ? `"${replaceText}" → "${replaceWithText}" preview.`
                      : tool === "organise" ? `${activeLayout?.label} layout preview.`
                      : tool === "enhance"  ? `${activeEnhance?.label} preview.`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
