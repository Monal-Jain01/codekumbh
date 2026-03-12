"use client";

import { useEffect, useRef } from "react";
import type { Property } from "@/lib/schema/property.schema";
import { MapPin } from "lucide-react";

interface PropertyMapProps {
  properties: Property[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { L: any }
}

function fmtPrice(n: number | null): string {
  if (!n) return "POA";
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `${(n / 1_00_000).toFixed(1)}L`;
  return `${(n / 1000).toFixed(0)}K`;
}

/** Load an external resource (CSS link or JS script) and resolve when ready */
function loadResource(tag: "link", attrs: Record<string, string>): Promise<void>;
function loadResource(tag: "script", attrs: Record<string, string>): Promise<void>;
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

export function PropertyMap({ properties }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  const mapped = properties.filter(p => p.latitude != null && p.longitude != null);

  useEffect(() => {
    async function boot() {
      /* 1. Leaflet CSS first — required before JS for marker rendering */
      await loadResource("link", {
        id:   "leaflet-css",
        rel:  "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      });

      /* 2. Inject pin styles */
      if (!document.getElementById("estator-pin-style")) {
        const style = document.createElement("style");
        style.id = "estator-pin-style";
        style.textContent = `
          .estator-pin {
            background: #7c3aed;
            color: #fff;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,.35);
            cursor: pointer;
            min-width: 56px;
            text-align: center;
            position: relative;
          }
          .estator-pin::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #7c3aed;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,.15) !important;
            padding: 0 !important;
          }
          .leaflet-popup-content {
            margin: 0 !important;
          }
          .leaflet-popup-tip-container { display: none; }
        `;
        document.head.appendChild(style);
      }

      /* 3. Leaflet JS */
      await loadResource("script", {
        id:  "leaflet-js",
        src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js",
      });

      /* 4. Init map */
      if (!containerRef.current || mapRef.current) return;
      const L = window.L;

      const centerLat = mapped.length
        ? mapped.reduce((s, p) => s + p.latitude!, 0) / mapped.length : 20.5937;
      const centerLng = mapped.length
        ? mapped.reduce((s, p) => s + p.longitude!, 0) / mapped.length : 78.9629;

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: mapped.length ? 11 : 5,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      mapped.forEach(p => {
        const priceText = `₹${fmtPrice(Number(p.asking_price))}`;

        const icon = L.divIcon({
          html:       `<div class="estator-pin">${priceText}</div>`,
          className:  "",        /* no extra leaflet classes */
          iconSize:   [70, 30],  /* [width, height] — sets the clickable hit area */
          iconAnchor: [35, 30],  /* [center-x, bottom] — pin tip ≈ bottom-center */
          popupAnchor:[0, -34],  /* popup opens above the pin */
        });

        const emoji =
          p.property_type === "apartment"        ? "🏢"
          : p.property_type === "villa"          ? "🏡"
          : p.property_type === "plot"           ? "🌳"
          : p.property_type === "commercial"     ? "🏪"
          : "🏠";

        const marker = L.marker([p.latitude!, p.longitude!], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="padding:12px 14px;min-width:170px;font-family:ui-sans-serif,system-ui,sans-serif;">
            <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 3px 0;">${emoji} ${p.title}</p>
            <p style="font-size:11px;color:#777;margin:0 0 8px 0;">📍 ${p.city ?? ""}, ${p.state ?? ""}</p>
            <p style="font-size:14px;font-weight:800;color:#7c3aed;margin:0 0 10px 0;">${priceText}</p>
            <a href="/properties/${p.id}"
               style="display:inline-block;background:#7c3aed;color:#fff;padding:5px 14px;border-radius:9999px;font-size:11px;font-weight:600;text-decoration:none;">
              View Property →
            </a>
          </div>
        `, { maxWidth: 230 });
      });
    }

    boot();

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mapped.length === 0) {
    return (
      <div className="w-full h-[480px] rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <MapPin size={32} className="opacity-30" />
        <p className="text-sm font-medium">No properties with GPS coordinates</p>
        <p className="text-xs text-center max-w-xs">
          Properties need latitude & longitude to appear on the map.
          Add GPS when creating a listing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground px-1">
        Showing {mapped.length} of {properties.length} propert{properties.length !== 1 ? "ies" : "y"} with location data. Click a pin to view details.
      </p>
      <div ref={containerRef} className="w-full h-[480px] rounded-xl overflow-hidden border border-border" />
    </div>
  );
}
