"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/lib/supabase/realtime";

/**
 * Invisible component that subscribes to Supabase Realtime
 * for new offers on a specific property.
 * When a new offer arrives, it auto-refreshes the page and shows a toast.
 */
export function RealtimeOfferListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "offers",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: (payload) => {
      const newOffer = payload.new as Record<string, unknown> | undefined;
      const price = newOffer?.offer_price
        ? `₹${Number(newOffer.offer_price).toLocaleString("en-IN")}`
        : "";
      toast.info(`New offer received${price ? `: ${price}` : ""}!`);
      router.refresh();
    },
  });

  return null;
}

/**
 * Listens for new property_context entries (neighbourhood data enrichment).
 */
export function RealtimeContextListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "property_context",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: () => {
      toast.success("Neighbourhood intelligence is ready!");
      router.refresh();
    },
  });

  return null;
}

/**
 * Listens for a new AI valuation being inserted for this property.
 * Refreshes the page so the AIValuationCard shows real data without a reload.
 */
export function RealtimeValuationListener({ propertyId }: { propertyId: string }) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "ai_property_valuations",
    event: "INSERT",
    filterColumn: "property_id",
    filterValue: propertyId,
    onEvent: (payload) => {
      const val = payload.new as Record<string, unknown> | undefined;
      const price = val?.predicted_price
        ? `₹${Number(val.predicted_price).toLocaleString("en-IN")}`
        : "";
      toast.success(
        price
          ? `AI valuation ready — estimated ${price}`
          : "AI property valuation is ready!",
        { duration: 5000 }
      );
      router.refresh();
    },
  });

  return null;
}

/**
 * Listens for updates to this buyer's offer (accepted / rejected / countered).
 * Only mount on the buyer's side of the property page.
 */
export function RealtimeBuyerOfferListener({
  userId,
  propertyId,
}: {
  userId: string;
  propertyId: string;
}) {
  const router = useRouter();

  useRealtimeSubscription({
    table: "offers",
    event: "UPDATE",
    filterColumn: "buyer_id",
    filterValue: userId,
    onEvent: (payload) => {
      const offer = payload.new as Record<string, unknown> | undefined;
      if (!offer || offer.property_id !== propertyId) return;

      const status = offer.status as string | undefined;
      if (status === "accepted") {
        toast.success("Your offer was accepted! The seller will contact you soon.", {
          duration: 8000,
        });
      } else if (status === "rejected") {
        toast.error("Your offer was declined by the seller.");
      } else if (status === "countered") {
        const counterPrice = offer.counter_price
          ? `₹${Number(offer.counter_price).toLocaleString("en-IN")}`
          : "";
        toast.info(
          counterPrice
            ? `Seller sent a counter offer of ${counterPrice}`
            : "Seller sent a counter offer!",
          { duration: 8000 }
        );
      }
      router.refresh();
    },
  });

  return null;
}
