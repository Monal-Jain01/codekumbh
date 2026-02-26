"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToOffer } from "@/actions/property/property";

interface OfferActionsProps {
  offerId: string;
  status: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
}

export function OfferActions({ offerId, status, buyerName, buyerPhone }: OfferActionsProps) {
  const [loading, setLoading] = useState<"accepted" | "rejected" | null>(null);
  const router = useRouter();

  async function handleAction(action: "accepted" | "rejected") {
    setLoading(action);
    const result = await respondToOffer(offerId, action);
    setLoading(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(action === "accepted" ? "Offer accepted!" : "Offer rejected.");
    router.refresh();
  }

  if (status !== "pending") {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
            status === "accepted"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status === "accepted" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {status}
        </span>
        {status === "accepted" && buyerPhone && (
          <a
            href={`tel:${buyerPhone}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Phone size={11} /> {buyerPhone}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {buyerName && (
        <span className="text-xs text-muted-foreground mr-1">{buyerName}</span>
      )}
      {buyerPhone && (
        <a
          href={`tel:${buyerPhone}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mr-1"
          title={`Call ${buyerName ?? "buyer"}`}
        >
          <Phone size={11} />
        </a>
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
        disabled={loading !== null}
        onClick={() => handleAction("accepted")}
      >
        {loading === "accepted" ? (
          <Loader2 size={12} className="animate-spin mr-1" />
        ) : (
          <CheckCircle2 size={12} className="mr-1" />
        )}
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50"
        disabled={loading !== null}
        onClick={() => handleAction("rejected")}
      >
        {loading === "rejected" ? (
          <Loader2 size={12} className="animate-spin mr-1" />
        ) : (
          <XCircle size={12} className="mr-1" />
        )}
        Reject
      </Button>
    </div>
  );
}
