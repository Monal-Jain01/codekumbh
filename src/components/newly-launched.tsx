"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BedDouble, Ruler, MapPin, IndianRupee } from "lucide-react";
import type { Property } from "@/lib/schema/property.schema";
import { Badge } from "@/components/ui/badge";

const TYPE_GRADIENT: Record<string, string> = {
  apartment: "from-blue-600 to-indigo-600",
  villa: "from-emerald-500 to-teal-600",
  independent_house: "from-amber-500 to-orange-500",
  plot: "from-lime-500 to-green-600",
  commercial: "from-purple-500 to-violet-600",
};

const TYPE_EMOJI: Record<string, string> = {
  apartment: "🏢",
  villa: "🏡",
  independent_house: "🏠",
  plot: "🌳",
  commercial: "🏪",
};

const SCROLL_AMOUNT = 296;

function formatPrice(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
}

export function NewlyLaunched({ properties }: { properties: Property[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  if (properties.length === 0) return null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Newly Listed</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fresh listings added recently</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" })}
            aria-label="Scroll left"
            className={`w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all ${canScrollLeft ? "opacity-100" : "opacity-30 cursor-not-allowed"}`}
            disabled={!canScrollLeft}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" })}
            aria-label="Scroll right"
            className={`w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all ${canScrollRight ? "opacity-100" : "opacity-30 cursor-not-allowed"}`}
            disabled={!canScrollRight}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {properties.map((p) => {
          const gradient = TYPE_GRADIENT[p.property_type ?? ""] ?? "from-slate-500 to-slate-600";
          const emoji = TYPE_EMOJI[p.property_type ?? ""] ?? "🏠";
          const price = p.asking_price ? formatPrice(Number(p.asking_price)) : "Price on Request";

          return (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="flex-shrink-0 w-[272px] group"
            >
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5">
                {/* Gradient top */}
                <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <span className="text-4xl opacity-60 select-none">{emoji}</span>
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 bg-white/20 text-white border-0 text-[9px] font-bold uppercase backdrop-blur-sm"
                  >
                    New
                  </Badge>
                  <span className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    RERA ✓
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <MapPin size={9} /> {p.city}, {p.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.bedrooms != null && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        <BedDouble size={9} /> {p.bedrooms} BHK
                      </span>
                    )}
                    {p.area_sqft != null && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        <Ruler size={9} /> {p.area_sqft} sqft
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <p className="flex items-center gap-0.5 text-sm font-bold text-foreground">
                      <IndianRupee size={12} strokeWidth={2.5} />
                      {price}
                    </p>
                    <span className="text-[10px] text-primary font-medium capitalize">
                      {p.property_type?.replace("_", " ") ?? "Property"}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
