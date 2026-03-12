"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BedDouble, Ruler, MapPin, Sparkles } from "lucide-react";
import type { Property } from "@/lib/schema/property.schema";

const SCROLL_AMOUNT = 320;

function formatPrice(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const placeholderImages = [
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1175&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
];

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">AI Curated Listings</h2>
          <p className="text-sm md:text-base text-white/60 mt-1">Properties handpicked and evaluated by our AI.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" })}
            aria-label="Scroll left"
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all ${canScrollLeft ? "opacity-100" : "opacity-30 cursor-not-allowed"}`}
            disabled={!canScrollLeft}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" })}
            aria-label="Scroll right"
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all ${canScrollRight ? "opacity-100" : "opacity-30 cursor-not-allowed"}`}
            disabled={!canScrollRight}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {properties.map((p, idx) => {
          const price = p.asking_price ? formatPrice(Number(p.asking_price)) : "Price on Request";
          const imageSrc = placeholderImages[idx % placeholderImages.length];

          return (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="flex-shrink-0 w-[300px] sm:w-[340px] group snap-start"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.2)] hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                {/* Image Top */}
                <div className="relative h-48 w-full overflow-hidden">
                  <img src={imageSrc} alt={p.title || "Property"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Sparkles size={12} className="text-violet-400" /> AI Estimate: {price}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="mb-4">
                    <p className="text-lg font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {p.title}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs sm:text-sm text-white/60 mt-1.5">
                      <MapPin size={14} className="text-white/40" /> {p.city || "Dubai"}, {p.state || "UAE"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    {p.bedrooms != null && (
                      <span className="flex items-center gap-1.5 text-xs text-white/80 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">
                        <BedDouble size={14} className="text-indigo-400" /> {p.bedrooms} Beds
                      </span>
                    )}
                    {p.area_sqft != null && (
                      <span className="flex items-center gap-1.5 text-xs text-white/80 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">
                        <Ruler size={14} className="text-indigo-400" /> {p.area_sqft} sqft
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Asking Price</span>
                    <p className="text-lg font-bold text-white">
                      {price}
                    </p>
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
