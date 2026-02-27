"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

import { Tag, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import type { Property } from "@/lib/schema/property.schema";

const badgeColors: Record<string, string> = {
    "NEW LAUNCH": "bg-amber-400 text-amber-900",
    "NEW ARRIVAL": "bg-blue-400 text-blue-900",
};

const SCROLL_AMOUNT = 310; // roughly one card width + gap

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

    const scrollLeft = () => {
        scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
    };

    const scrollRight = () => {
        scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
    };

    return (
        <section className="w-full max-w-[920px] bg-muted rounded-2xl p-5 font-sans">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-accent rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    🏢
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                        Newly launched projects
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Preferred units at zero brokerage
                    </p>
                </div>
            </div>

            {/* Scroll wrapper with arrow buttons */}
            <div className="relative">
                {/* Left Arrow */}
                <button
                    onClick={scrollLeft}
                    aria-label="Scroll left"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 bg-card rounded-full shadow-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 ${canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                >
                    <ChevronLeft size={18} />
                </button>

                {/* Right Arrow */}
                <button
                    onClick={scrollRight}
                    aria-label="Scroll right"
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 bg-card rounded-full shadow-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 ${canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                >
                    <ChevronRight size={18} />
                </button>

                {/* Scrollable Cards */}
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                >
                    {properties.map((p) => {
                        // Dummy mapping for UI consistency since some fields might not exact match
                        const badge = "NEW LAUNCH";
                        const image = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&h=120&fit=crop";
                        const name = p.title || "Untitled Property";
                        const location = `${p.city || "Unknown City"}, ${p.state || "Unknown State"}`;
                        const priceRange = p.asking_price ? `₹${Number(p.asking_price).toLocaleString("en-IN")}` : "Price on Request";
                        const config = [
                            p.bedrooms ? `${p.bedrooms} BHK` : null,
                            p.property_type ? p.property_type.replace("_", " ") : null
                        ].filter(Boolean).join(" ");
                        const certifications = ["RERA"]; // Dummy for now
                        const extraInfo = p.status === "active" ? "Ready to move" : "Under construction";
                        const extraInfoGreen = p.status === "active";

                        return (
                            <div
                                key={p.id}
                                className="flex-shrink-0 w-[290px] bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden"
                            >
                                {/* Badge */}
                                <div className="px-3 pt-3 pb-0">
                                    <span
                                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badgeColors[badge]}`}
                                    >
                                        {badge}
                                    </span>
                                </div>

                                {/* Main Info */}
                                <div className="flex gap-3 p-3">
                                    {/* Circular Image */}
                                    <div className="flex-shrink-0 relative">
                                        <img
                                            src={image}
                                            alt={name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-border"
                                        />
                                        {/* RERA / HIRA badges on image */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                            {certifications.map((cert) => (
                                                <span
                                                    key={cert}
                                                    className="flex items-center gap-0.5 bg-primary text-primary-foreground text-[8px] font-bold px-1 py-0.5 rounded"
                                                >
                                                    <ShieldCheck size={8} />
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Text Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-card-foreground line-clamp-2 leading-snug" title={name}>
                                            {name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={location}>
                                            {location}
                                        </p>
                                        <p className="text-sm font-semibold text-foreground mt-1.5">
                                            {priceRange}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate capitalize">
                                            {config}
                                        </p>
                                        <p
                                            className={`text-xs mt-1 truncate ${extraInfoGreen
                                                ? "text-green-600 font-medium"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {extraInfoGreen ? "" : "🕐 "}
                                            {extraInfo}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-border mx-3" />

                                {/* Footer */}
                                <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium flex-shrink-0">
                                        <Tag size={12} className="flex-shrink-0" />
                                        <span className="leading-tight">
                                            Get preferred options
                                            <br />
                                            @zero brokerage
                                        </span>
                                    </div>
                                    <button className="flex-shrink-0 px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold rounded-lg border-0 cursor-pointer transition-opacity whitespace-nowrap">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
