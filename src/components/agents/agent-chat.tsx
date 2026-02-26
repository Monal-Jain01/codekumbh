"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Wrench,
  Sparkles,
  RotateCcw,
  Zap,
  Database,
} from "lucide-react";
import { sendAgentMessage } from "@/actions/agents/chat";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  timestamp: Date;
  status?: "pending" | "processing" | "completed" | "failed";
  /** DB task ID — used for realtime subscription */
  taskId?: string;
}

// Tool descriptions for each agent type
const AGENT_TOOL_INFO: Record<string, { name: string; tools: string[] }> = {
  "property-valuation": {
    name: "Valuation",
    tools: [
      "DB Property Search",
      "Market Stats",
      "Investment Metrics",
      "Previous Valuations",
    ],
  },
  "investment-advisory": {
    name: "Advisory",
    tools: [
      "DB Property Search",
      "Market Stats",
      "Investment Metrics",
      "Previous Valuations",
    ],
  },
  "market-intelligence": {
    name: "Intelligence",
    tools: [
      "DB Property Search",
      "Market Stats",
      "Investment Metrics",
      "Previous Valuations",
    ],
  },
  "offer-risk": {
    name: "Risk Assessment",
    tools: [
      "Offer Analysis",
      "Anomaly Detection",
      "Market Stats",
      "Property Search",
    ],
  },
  "portfolio-optimization": {
    name: "Portfolio",
    tools: [
      "Portfolio Summary",
      "Property Search",
      "Market Stats",
      "Investment Metrics",
    ],
  },
  "fraud-anomaly": {
    name: "Fraud Detection",
    tools: [
      "Anomaly Detection",
      "Property Search",
      "Market Stats",
      "Offer Analysis",
    ],
  },
};

interface AgentChatProps {
  agentId: string;
  agentName: string;
  placeholder: string;
}

export function AgentChat({ agentId, agentName, placeholder }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toolInfo = AGENT_TOOL_INFO[agentId];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Realtime: listen for agent_tasks updates ──────────────────────
  const handleRealtimeUpdate = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const row = payload.new;
      const taskId = row.id as string;
      const status = row.status as string;

      if (status === "processing") {
        // Update the pending message to show "processing"
        setMessages((prev) =>
          prev.map((m) =>
            m.taskId === taskId ? { ...m, status: "processing" } : m
          )
        );
        return;
      }

      if (status === "completed" || status === "failed") {
        const response =
          (row.response as string) ??
          "Agent could not generate a response.";
        const toolsUsed = (row.tools_used as string[]) ?? [];

        // Replace the pending placeholder with the actual response
        setMessages((prev) =>
          prev.map((m) =>
            m.taskId === taskId
              ? {
                  ...m,
                  content: response,
                  toolsUsed,
                  status: status as "completed" | "failed",
                  timestamp: new Date(),
                }
              : m
          )
        );

        setLoading(false);
        setActiveTaskId(null);

        if (status === "failed") {
          toast.error("Agent encountered an error. Try again.");
        }
      }
    },
    []
  );

  useRealtimeSubscription({
    table: "agent_tasks",
    event: "UPDATE",
    filterColumn: "id",
    filterValue: activeTaskId ?? undefined,
    onEvent: handleRealtimeUpdate as (payload: unknown) => void,
    enabled: !!activeTaskId,
  });

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add user message locally
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendAgentMessage(agentId, text, history);

      if ("error" in result) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      // Add a pending bot placeholder — will be replaced by realtime
      const pendingMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        status: "pending",
        taskId: result.taskId,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, pendingMsg]);
      setActiveTaskId(result.taskId);
    } catch {
      toast.error("Failed to send message.");
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setActiveTaskId(null);
    setLoading(false);
    toast.success("Chat cleared");
  };

  const formatToolName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot size={32} className="text-primary" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  {agentName}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  This agent runs as a <strong>background task</strong> using
                  real-time database tools. Responses arrive via live updates.
                </p>
              </div>

              {/* How it works */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-4 py-2.5">
                <span className="flex items-center gap-1">
                  <Send size={10} /> Send
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Zap size={10} /> Trigger.dev
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Database size={10} /> DB Tools
                </span>
                <span>→</span>
                <span className="flex items-center gap-1">
                  <Sparkles size={10} /> Realtime
                </span>
              </div>

              {/* Tool badges */}
              {toolInfo && (
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
                  <Wrench size={12} className="text-muted-foreground" />
                  {toolInfo.tools.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/50"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
                {getSuggestedPrompts(agentId).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <Sparkles
                      size={10}
                      className="inline mr-1.5 text-primary"
                    />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {/* Pending / Processing state */}
                  {msg.role === "assistant" &&
                  (msg.status === "pending" || msg.status === "processing") ? (
                    <div className="flex items-center gap-3 py-1">
                      <Loader2
                        size={16}
                        className="animate-spin text-primary"
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">
                          {msg.status === "pending"
                            ? "Queued — waiting for background worker..."
                            : "Processing — querying database tools..."}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {msg.status === "pending"
                            ? "Task submitted to Trigger.dev"
                            : "AI agent is analysing real data from your database"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-secondary-foreground" />
                  </div>
                )}
              </div>
              {/* Tool usage indicator */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Wrench size={10} className="text-muted-foreground" />
                    {msg.toolsUsed.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded"
                      >
                        {formatToolName(t)}
                      </span>
                    ))}
                    <span className="text-[10px] text-green-600 font-medium ml-1">
                      ✓ Live data
                    </span>
                  </div>
                </div>
              )}
              {/* Failed state indicator */}
              {msg.status === "failed" && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7" />
                  <span className="text-[10px] text-red-500 font-medium">
                    ✕ Task failed
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear chat"
              className="w-10 h-10 rounded-xl bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-muted transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSend()
            }
            placeholder={placeholder}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Status bar when processing */}
        {loading && activeTaskId && (
          <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              Background task running · Listening for realtime updates
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Suggested prompts per agent ─────────────────────────────────────
function getSuggestedPrompts(agentId: string): string[] {
  const prompts: Record<string, string[]> = {
    "property-valuation": [
      "Value a 3BHK in Sector 62, Noida — 1800 sqft",
      "Compare 2BHK prices in Whitefield, Bangalore",
      "What's the fair price for a villa in Goa?",
      "Estimate value of a 1200 sqft flat in Pune",
    ],
    "investment-advisory": [
      "Best areas to invest 50L in Bangalore?",
      "Should I buy a flat or plot in Noida?",
      "High rental yield areas in Mumbai under 1Cr",
      "Compare ROI: Hyderabad vs Chennai apartments",
    ],
    "market-intelligence": [
      "Property market trends in Pune 2024",
      "Which cities have highest price growth?",
      "Compare apartment prices across top 5 cities",
      "Is it a buyer's or seller's market in Delhi?",
    ],
    "offer-risk": [
      "Got an 85L offer on my 95L property — risky?",
      "Analyze risk of offers below asking price",
      "Should I accept a quick-close offer at 10% discount?",
      "How do my received offers compare to market?",
    ],
    "portfolio-optimization": [
      "Analyze my current property portfolio",
      "Am I over-invested in one city?",
      "Suggest diversification for my holdings",
      "When should I exit my oldest investment?",
    ],
    "fraud-anomaly": [
      "Is a 3BHK in Mumbai at 15L legitimate?",
      "Check for price anomalies in Gurgaon listings",
      "Flag suspicious listings under 5L in metro cities",
      "How to spot fake property listings?",
    ],
  };
  return prompts[agentId] ?? [];
}
