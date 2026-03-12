"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Phone, ArrowLeftRight, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { respondToOffer, sendCounterOffer } from "@/actions/property/property";

interface OfferActionsProps {
  offerId: string;
  status: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  offerPrice?: number;
  counterPrice?: number | null;
}

export function OfferActions({ offerId, status, buyerName, buyerPhone, offerPrice, counterPrice: existingCounter }: OfferActionsProps) {
  const [loading, setLoading]             = useState<"accepted" | "rejected" | null>(null);
  const [showCounter, setShowCounter]     = useState(false);
  const [counterPrice, setCounterPrice]   = useState(offerPrice ? String(Math.round(offerPrice * 1.05)) : "");
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterSent, setCounterSent]     = useState(status === "countered");
  const router = useRouter();

  async function handleAction(action: "accepted" | "rejected") {
    setLoading(action);
    const result = await respondToOffer(offerId, action);
    setLoading(null);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(action === "accepted" ? "Offer accepted!" : "Offer rejected.");
    router.refresh();
  }

  async function handleSendCounter() {
    if (!counterPrice || isNaN(Number(counterPrice))) {
      toast.error("Enter a valid counter price");
      return;
    }
    setCounterLoading(true);
    const result = await sendCounterOffer(offerId, Number(counterPrice));
    setCounterLoading(false);
    if ("error" in result) { toast.error(result.error); return; }
    setCounterSent(true);
    setShowCounter(false);
    toast.success(`Counter offer of ₹${Number(counterPrice).toLocaleString("en-IN")} sent to ${buyerName ?? "buyer"}!`);
    router.refresh();
  }

  /* ── Resolved status ── */
  if (status !== "pending" && !counterSent) {
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
          status === "accepted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : status === "countered" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                 : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
          {status === "accepted" ? <CheckCircle2 size={12} /> : status === "countered" ? <ArrowLeftRight size={12} /> : <XCircle size={12} />}
          {status === "countered"
            ? `Countered @ ₹${Number(existingCounter ?? counterPrice).toLocaleString("en-IN")}`
            : status}
        </span>
        {status === "accepted" && buyerPhone && (
          <a href={`tel:${buyerPhone}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Phone size={11} /> {buyerPhone}
          </a>
        )}
      </div>
    );
  }

  /* ── Counter sent badge ── */
  if (counterSent) {
    const displayPrice = existingCounter ? String(existingCounter) : counterPrice;
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        <ArrowLeftRight size={11} />
        {displayPrice ? `Countered @ ₹${Number(displayPrice).toLocaleString("en-IN")}` : "Counter Sent"}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Action buttons row */}
      <div className="flex items-center gap-2">
        {buyerPhone && (
          <a href={`tel:${buyerPhone}`} title={`Call ${buyerName ?? "buyer"}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mr-1">
            <Phone size={11} />
          </a>
        )}
        <Button size="sm" variant="outline"
          className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
          disabled={loading !== null || counterLoading}
          onClick={() => handleAction("accepted")}>
          {loading === "accepted"
            ? <Loader2 size={12} className="animate-spin mr-1" />
            : <CheckCircle2 size={12} className="mr-1" />}
          Accept
        </Button>
        <Button size="sm" variant="outline"
          className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
          disabled={loading !== null || counterLoading}
          onClick={() => setShowCounter((v) => !v)}>
          <ArrowLeftRight size={12} className="mr-1" />
          Counter
        </Button>
        <Button size="sm" variant="outline"
          className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          disabled={loading !== null || counterLoading}
          onClick={() => handleAction("rejected")}>
          {loading === "rejected"
            ? <Loader2 size={12} className="animate-spin mr-1" />
            : <XCircle size={12} className="mr-1" />}
          Reject
        </Button>
      </div>

      {/* Counter offer form — inline */}
      {showCounter && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 w-full mt-1">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium shrink-0">₹</span>
          <Input
            type="number"
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
            placeholder="Counter price"
            className="h-7 text-xs border-amber-200 dark:border-amber-800 bg-transparent focus-visible:ring-amber-400/50 w-36"
          />
          <Button size="sm"
            className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-2.5 shrink-0"
            disabled={counterLoading}
            onClick={handleSendCounter}>
            {counterLoading
              ? <Loader2 size={11} className="animate-spin" />
              : <><Send size={11} className="mr-1" /> Send</>}
          </Button>
          <button onClick={() => setShowCounter(false)}
            className="text-muted-foreground hover:text-foreground shrink-0">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
