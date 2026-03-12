"use client";

import { useState } from "react";
import Image from "next/image";
import { Wand2, Star, Images } from "lucide-react";
import { AIStudio } from "@/components/ai-studio";
import type { StudioPhoto, StudioTool } from "@/components/ai-studio";
import type { PropertyImage } from "@/lib/schema/property.schema";
import { cn } from "@/lib/utils";

interface PropertyImageGalleryProps {
  images: PropertyImage[];
  propertyTitle: string;
  propertyType?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  apartment: "🏢", villa: "🏡", plot: "🌳", commercial: "🏪", independent_house: "🏠",
};

export function PropertyImageGallery({ images, propertyTitle, propertyType }: PropertyImageGalleryProps) {
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [studioId, setStudioId]   = useState<string | null>(null);
  const [applied, setApplied]     = useState<Record<string, { tool: StudioTool; preset?: string; outputUrl?: string }>>({});

  const coverImage = images.find(img => img.is_cover) ?? images[0] ?? null;
  const thumbs     = images.filter(img => img.id !== coverImage?.id);

  /* Build StudioPhoto from a PropertyImage */
  function toStudioPhoto(img: PropertyImage): StudioPhoto {
    return {
      id: img.id,
      url: img.image_url,
      label: `${propertyTitle} · Photo ${img.display_order + 1}${img.is_cover ? " (Cover)" : ""}`,
      applied: applied[img.id] ?? null,
    };
  }

  const studioPhoto = studioId
    ? images.find(x => x.id === studioId)
      ? toStudioPhoto(images.find(x => x.id === studioId)!)
      : null
    : null;

  function handleApply(id: string, tool: StudioTool, preset?: string, outputUrl?: string) {
    setApplied(prev => ({ ...prev, [id]: { tool, preset, outputUrl } }));
  }

  /* No images at all */
  if (!images.length) {
    return (
      <div className="h-56 sm:h-72 bg-gradient-to-br from-primary/10 to-accent rounded-xl border border-border flex items-center justify-center">
        <span className="text-6xl">{TYPE_EMOJI[propertyType ?? ""] ?? "🏠"}</span>
      </div>
    );
  }

  const viewingImg = activeId ? images.find(x => x.id === activeId) : null;

  return (
    <>
      {/* AI Studio modal */}
      {studioPhoto && (
        <AIStudio
          photo={studioPhoto}
          onClose={() => setStudioId(null)}
          onApply={handleApply}
        />
      )}

      {/* Cover image */}
      {coverImage && (
        <div className="group relative h-56 sm:h-72 rounded-xl overflow-hidden border border-border">
          <Image
            src={coverImage.image_url} alt={propertyTitle} fill
            className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" priority
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-200" />

          {/* Studio button */}
          <button
            onClick={() => setStudioId(coverImage.id)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0"
          >
            <Wand2 size={12} /> Open AI Studio
          </button>

          {/* AI applied badge */}
          {applied[coverImage.id] && (
            <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-violet-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <Wand2 size={8} /> AI Enhanced
            </div>
          )}

          {/* Photo count badge */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 text-white text-[10px] font-medium px-2 py-1 rounded-full">
              <Images size={10} /> {images.length} photos
            </div>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {thumbs.map(img => (
            <div
              key={img.id}
              className={cn(
                "group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                activeId === img.id ? "border-primary" : "border-border hover:border-primary/50",
              )}
              onClick={() => setActiveId(activeId === img.id ? null : img.id)}
            >
              <Image src={img.image_url} alt="" fill
                className="object-cover" sizes="160px" unoptimized />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <button
                  onClick={e => { e.stopPropagation(); setStudioId(img.id); }}
                  className="flex items-center gap-0.5 bg-white/90 hover:bg-white text-slate-800 text-[9px] font-bold px-1.5 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Wand2 size={9} /> Studio
                </button>
              </div>
              {applied[img.id] && (
                <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full bg-violet-600/90 flex items-center justify-center">
                  <Wand2 size={7} className="text-white" />
                </div>
              )}
              {img.is_cover && (
                <div className="absolute bottom-1 right-1">
                  <Star size={9} className="text-amber-400 fill-amber-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded view of selected thumbnail */}
      {viewingImg && (
        <div className="group relative h-48 sm:h-64 rounded-xl overflow-hidden border border-primary/40">
          <Image src={viewingImg.image_url} alt="" fill
            className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all" />
          <button
            onClick={() => setStudioId(viewingImg.id)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0"
          >
            <Wand2 size={12} /> Open AI Studio
          </button>
          {applied[viewingImg.id] && (
            <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-violet-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <Wand2 size={8} /> AI Enhanced
            </div>
          )}
        </div>
      )}
    </>
  );
}
