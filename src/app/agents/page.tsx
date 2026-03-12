import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  TrendingUp,
  ShieldAlert,
  BarChart3,
  PieChart,
  AlertTriangle,
  Zap,
  ArrowRight,
} from "lucide-react";

const agents = [
  {
    id: "property-valuation",
    name: "Property Valuation Agent",
    description:
      "AI-powered property valuation using market comparables, location analytics, and historical trends to give you an accurate fair-market estimate.",
    icon: TrendingUp,
    status: "ready" as const,
    accent: "chart-1",
    bgClass: "bg-chart-1/10",
    iconClass: "text-chart-1",
  },
  {
    id: "investment-advisory",
    name: "Investment Advisory Agent",
    description:
      "Get personalized investment recommendations based on your risk tolerance, budget, and market conditions. Optimized for long-term portfolio growth.",
    icon: BarChart3,
    status: "ready" as const,
    accent: "chart-2",
    bgClass: "bg-chart-2/10",
    iconClass: "text-chart-2",
  },
  {
    id: "offer-risk",
    name: "Offer Risk Assessment",
    description:
      "Analyze buyer and seller credibility, transaction history, and market volatility to assess the risk level of any property offer.",
    icon: ShieldAlert,
    status: "ready" as const,
    accent: "chart-3",
    bgClass: "bg-chart-3/10",
    iconClass: "text-chart-3",
  },
  {
    id: "market-intelligence",
    name: "Market Intelligence Agent",
    description:
      "Real-time market trends, price movements, demand-supply metrics, and micro-market insights for informed decision-making.",
    icon: PieChart,
    status: "ready" as const,
    accent: "chart-4",
    bgClass: "bg-chart-4/10",
    iconClass: "text-chart-4",
  },
  {
    id: "portfolio-optimization",
    name: "Portfolio Optimization Agent",
    description:
      "Maximize returns across your real estate portfolio with AI-driven rebalancing suggestions, diversification analysis, and exit timing.",
    icon: Zap,
    status: "ready" as const,
    accent: "chart-5",
    bgClass: "bg-chart-5/10",
    iconClass: "text-chart-5",
  },
  {
    id: "fraud-anomaly",
    name: "Fraud & Anomaly Detection",
    description:
      "Detect suspicious listings, price manipulation, fake documents, and anomalous transaction patterns using advanced ML models.",
    icon: AlertTriangle,
    status: "ready" as const,
    accent: "destructive",
    bgClass: "bg-destructive/10",
    iconClass: "text-destructive",
  },
];

export default async function AgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
              <p className="text-sm text-muted-foreground">
                Intelligent assistants to power your real estate decisions
              </p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isReady = agent.status === "ready";

            return (
              <div
                key={agent.id}
                className="group relative bg-card rounded-xl border border-border p-5 flex flex-col gap-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                {/* Status badge */}
                <span
                  className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isReady
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isReady ? "Ready" : "Coming Soon"}
                </span>

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${agent.bgClass} flex items-center justify-center`}
                >
                  <Icon size={24} className={agent.iconClass} />
                </div>

                {/* Text */}
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Action */}
                {isReady ? (
                  <Link
                    href={`/agents/${agent.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-auto"
                  >
                    Launch Agent <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mt-auto cursor-default">
                    Notify Me <ArrowRight size={14} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="bg-muted/50 rounded-xl border border-border p-5">
          <div className="flex items-start gap-3">
            <Bot size={20} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                How do these agents work?
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Our AI agents combine large language models with real-time market
                data, property records, and your personal preferences to deliver
                actionable insights. Each agent specializes in a specific domain
                and improves over time as it learns from more data points.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
