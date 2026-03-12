"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Hospital, GraduationCap, Train, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface NearbyPlace {
  name: string;
  category: PlaceCategory;
  distance: number; // metres
  lat: number;
  lng: number;
}

type PlaceCategory = "hospital" | "school" | "transit" | "shopping";

interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
  color: string;      // Leaflet marker colour (hex)
  geoapifyCategory: string;
  bgClass: string;
  textClass: string;
}

const CATEGORIES: Record<PlaceCategory, CategoryConfig> = {
  hospital: {
    label:            "Hospitals",
    icon:             <Hospital size={13} />,
    color:            "#ef4444",
    geoapifyCategory: "healthcare.hospital,healthcare.pharmacy",
    bgClass:          "bg-red-100 dark:bg-red-900/20",
    textClass:        "text-red-700 dark:text-red-400",
  },
  school: {
    label:            "Schools",
    icon:             <GraduationCap size={13} />,
    color:            "#3b82f6",
    geoapifyCategory: "education.school,education.college,education.university",
    bgClass:          "bg-blue-100 dark:bg-blue-900/20",
    textClass:        "text-blue-700 dark:text-blue-400",
  },
  transit: {
    label:            "Transit",
    icon:             <Train size={13} />,
    color:            "#10b981",
    geoapifyCategory: "public_transport.train,public_transport.bus",
    bgClass:          "bg-emerald-100 dark:bg-emerald-900/20",
    textClass:        "text-emerald-700 dark:text-emerald-400",
  },
  shopping: {
    label:            "Shopping",
    icon:             <ShoppingBag size={13} />,
    color:            "#f59e0b",
    geoapifyCategory: "commercial.shopping_mall,commercial.supermarket",
    bgClass:          "bg-amber-100 dark:bg-amber-900/20",
    textClass:        "text-amber-700 dark:text-amber-400",
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { L: any } }

function loadResource(tag: "link" | "script", attrs: Record<string, string>): Promise<void> {
  return new Promise(resolve => {
    const id = attrs.id;
    if (id && document.getElementById(id)) { resolve(); return; }
    const el = document.createElement(tag) as any;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.onload = () => resolve();
    document.head.appendChild(el);
  });
}

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/* ── Component ────────────────────────────────────────────────────────────── */

interface Props {
  lat: number;
  lng: number;
  propertyTitle?: string | null;
}

export function NearbyPlacesMap({ lat, lng, propertyTitle }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);

  const [activeTab,   setActiveTab]   = useState<PlaceCategory>("hospital");
  const [places,      setPlaces]      = useState<NearbyPlace[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [mapReady,    setMapReady]    = useState(false);

  /* ── 1. Init Leaflet map ────────────────────────────────────────────────── */
  useEffect(() => {
    let destroyed = false;

    async function boot() {
      await loadResource("link", {
        id:   "leaflet-css",
        rel:  "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      });

      // Inject pin styles (shared with property-map)
      if (!document.getElementById("estator-pin-style")) {
        const style = document.createElement("style");
        style.id = "estator-pin-style";
        style.textContent = `
          .nearby-pin {
            width: 22px; height: 22px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .nearby-pin-label {
            font: bold 10px/22px sans-serif;
            color: #fff;
            text-align: center;
            transform: rotate(45deg);
            display: block;
          }
          .prop-pin {
            background: #7c3aed;
            color: #fff;
            padding: 3px 8px;
            border-radius: 6px;
            font: bold 11px sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          }
        `;
        document.head.appendChild(style);
      }

      await loadResource("script", {
        id:  "leaflet-js",
        src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      });

      if (destroyed || !containerRef.current) return;
      if (mapRef.current) return; // already initialised

      const L = window.L;
      const map = L.map(containerRef.current, {
        center:          [lat, lng],
        zoom:            14,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom:     19,
      }).addTo(map);

      // Property marker (purple)
      const propIcon = L.divIcon({
        className: "",
        html: `<div class="prop-pin">${propertyTitle ?? "This property"}</div>`,
        iconAnchor: [0, 10],
      });
      L.marker([lat, lng], { icon: propIcon }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }

    boot();
    return () => { destroyed = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. Fetch places when tab changes ───────────────────────────────────── */
  useEffect(() => {
    if (!mapReady) return;

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      setError("NEXT_PUBLIC_GEOAPIFY_API_KEY not set");
      return;
    }

    setLoading(true);
    setError(null);

    const cfg = CATEGORIES[activeTab];
    const url = new URL("https://api.geoapify.com/v2/places");
    url.searchParams.set("categories", cfg.geoapifyCategory);
    url.searchParams.set("filter",     `circle:${lng},${lat},3000`);
    url.searchParams.set("bias",       `proximity:${lng},${lat}`);
    url.searchParams.set("limit",       "15");
    url.searchParams.set("apiKey",      apiKey);

    fetch(url.toString())
      .then(r => r.json())
      .then((data) => {
        const fetched: NearbyPlace[] = (data.features ?? []).map((f: any) => ({
          name:     f.properties.name ?? f.properties.address_line1 ?? "Unnamed",
          category: activeTab,
          distance: Math.round(f.properties.distance ?? 0),
          lat:      f.geometry.coordinates[1],
          lng:      f.geometry.coordinates[0],
        }));
        setPlaces(fetched);
        updateMarkers(fetched, cfg.color);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mapReady]);

  /* ── 3. Update Leaflet markers ───────────────────────────────────────────── */
  function updateMarkers(newPlaces: NearbyPlace[], color: string) {
    const L = window.L;
    if (!L || !mapRef.current) return;

    // Remove old place markers
    markersRef.current.forEach(m => mapRef.current.removeLayer(m));
    markersRef.current = [];

    const markerIcon = L.divIcon({
      className: "",
      html: `<div class="nearby-pin" style="background:${color}"><span class="nearby-pin-label">•</span></div>`,
      iconSize:   [22, 22],
      iconAnchor: [11, 22],
    });

    newPlaces.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: markerIcon })
        .bindTooltip(
          `<strong>${p.name}</strong><br>${fmtDist(p.distance)} away`,
          { direction: "top", offset: [0, -20] }
        )
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          <MapPin size={13} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nearby Places</p>
          <p className="text-[11px] text-muted-foreground">Within 3 km radius</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-border">
        {(Object.entries(CATEGORIES) as [PlaceCategory, CategoryConfig][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              activeTab === key
                ? `${cfg.bgClass} ${cfg.textClass} border-b-2`
                : "text-muted-foreground hover:text-foreground",
              activeTab === key && cfg.textClass.replace("text-", "border-"),
            )}
          >
            {cfg.icon}
            <span className="hidden sm:inline">{cfg.label}</span>
          </button>
        ))}
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-60" />

      {/* List */}
      <div className="p-3 space-y-1.5 max-h-52 overflow-y-auto">
        {error && (
          <p className="text-xs text-destructive text-center py-3">{error}</p>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Loading nearby places…</span>
          </div>
        )}
        {!loading && !error && places.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No {CATEGORIES[activeTab].label.toLowerCase()} found within 3 km.
          </p>
        )}
        {!loading && places.map((p, i) => {
          const cfg = CATEGORIES[p.category];
          return (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className={cn("flex items-center justify-center w-6 h-6 rounded-full shrink-0", cfg.bgClass, cfg.textClass)}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                {fmtDist(p.distance)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
