"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Home, MapPin, IndianRupee, Ruler, BedDouble, Bath, Calendar,
  FileText, Loader2, ArrowLeft, ArrowRight, Navigation2, Check,
  Upload, CheckCircle2, ImageIcon, Wand2, X, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createProperty } from "@/actions/property/property";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AIStudio } from "@/components/ai-studio";
import type { StudioPhoto, StudioTool } from "@/components/ai-studio";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
type PropertyType = "apartment" | "independent_house" | "villa" | "plot" | "commercial";

interface RoomPhoto {
  id: string;
  file: File;
  previewUrl: string;
  roomId: string;
  applied: { tool: StudioTool; preset?: string } | null;
  outputUrl?: string; // AI-processed result (base64 or URL)
}

interface Room {
  id: string; label: string; emoji: string;
  forTypes: PropertyType[] | "all";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const PROPERTY_TYPES = [
  { value: "apartment"         as const, label: "Apartment",         emoji: "🏢" },
  { value: "independent_house" as const, label: "Independent House", emoji: "🏠" },
  { value: "villa"             as const, label: "Villa",             emoji: "🏡" },
  { value: "plot"              as const, label: "Plot / Land",       emoji: "🌳" },
  { value: "commercial"        as const, label: "Commercial",        emoji: "🏪" },
];

const ALL_ROOMS: Room[] = [
  { id: "living",   label: "Living Room", emoji: "🛋️", forTypes: "all" },
  { id: "bedroom",  label: "Bedroom",     emoji: "🛏️", forTypes: ["apartment", "independent_house", "villa"] },
  { id: "kitchen",  label: "Kitchen",     emoji: "🍳", forTypes: ["apartment", "independent_house", "villa"] },
  { id: "bathroom", label: "Bathroom",    emoji: "🚿", forTypes: ["apartment", "independent_house", "villa"] },
  { id: "exterior", label: "Exterior",    emoji: "🌿", forTypes: "all" },
  { id: "others",   label: "Others",      emoji: "📷", forTypes: "all" },
];

const STEPS = ["Property Details", "Upload Photos", "Review & List"];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AI Description templates (dummy — for demo)                                */
/* ─────────────────────────────────────────────────────────────────────────── */
const DESC_TEMPLATES: Record<string, string> = {
  apartment:
    "Beautifully designed 3BHK apartment on the 14th floor of a premium high-rise offering sweeping city views. The thoughtfully laid-out floor plan features an open-concept living and dining area, a modern modular kitchen with premium appliances, and generously sized bedrooms with ample storage space. Enjoy world-class amenities including a rooftop infinity pool, fitness centre, children's play zone, and round-the-clock security. Excellent connectivity to major IT parks, metro stations, and top-rated schools — a perfect blend of luxury, comfort, and convenience.",
  independent_house:
    "Spacious 4BHK independent house on a 300 sq-yd corner plot in a well-established residential neighbourhood. The property features a landscaped front lawn, a wide driveway with covered parking for three vehicles, and a large terrace ideal for entertaining. Interiors include premium vitrified tiles, a chef-style modular kitchen, and elegant woodwork throughout. Tucked in a quiet lane, yet minutes from main roads, markets, and top schools — an ideal family home offering both privacy and urban convenience.",
  villa:
    "Exquisite 4BHK villa nestled in an exclusive gated community offering resort-style living. The double-height entrance foyer sets the tone for grand interiors featuring Italian marble flooring, a statement staircase, and large picture windows framing lush private garden views. The ground floor hosts a formal lounge, dining room, and gourmet kitchen. Upstairs, the master suite comes with a walk-in wardrobe and spa-style bathroom. Smart home automation, solar panels, and a rainwater harvesting system make this villa as intelligent as it is beautiful.",
  plot:
    "Prime residential plot in a fast-appreciating locality with all infrastructure in place — wide approach road, underground electrical cabling, water supply, and drainage. Surrounded by quality construction on three sides with clear titles and zero encumbrances. RERA-approved layout with building regulations permitting ground + 2 floors. Ideal for building your dream home or as a capital appreciation investment in one of the city's most sought-after growth corridors.",
  commercial:
    "Grade-A commercial space on a high-footfall arterial road, ideal for retail, showroom, or office use. The ground-floor unit offers a wide glass frontage, high ceilings, and an efficient column-free floor plate. The building provides ample car parking, 24/7 power backup, and a dedicated service entrance. Surrounded by established banks, restaurants, and anchor retail, this space benefits from exceptional walk-in traffic and strong brand visibility.",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Step Indicator                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
              i < current    ? "bg-primary text-primary-foreground"
              : i === current ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
              : "bg-muted text-muted-foreground border border-border",
            )}>
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span className={cn(
              "text-[11px] font-medium whitespace-nowrap hidden sm:block",
              i === current ? "text-foreground" : "text-muted-foreground",
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px flex-1 mx-3 mb-4 transition-all duration-500", i < current ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Photo Card                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function PhotoCard({ photo, onRemove, onOpenStudio }: {
  photo: RoomPhoto;
  onRemove: () => void;
  onOpenStudio: () => void;
}) {
  return (
    <div className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-200 bg-card">
      <div className="relative aspect-[4/3]">
        <Image src={photo.previewUrl} alt="Room photo" fill
          className="object-cover" sizes="220px" unoptimized />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all duration-200 flex items-center justify-center">
          <button onClick={onOpenStudio}
            className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0">
            <Wand2 size={12} /> Open Studio
          </button>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <X size={11} />
        </button>
        {photo.applied && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-violet-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
            <Wand2 size={8} /> AI
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground truncate max-w-[80%]">{photo.file.name}</span>
        <button onClick={onOpenStudio} className="text-[10px] text-primary font-medium hover:underline">Edit</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Review Step                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function ReviewStep({ formData, photos, propertyType, rooms, onBack, onSubmit, loading }: {
  formData: FormData | null; photos: RoomPhoto[]; propertyType: PropertyType;
  rooms: Room[]; onBack: () => void; onSubmit: () => void; loading: boolean;
}) {
  const typeInfo = PROPERTY_TYPES.find(t => t.value === propertyType);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home size={16} className="text-primary" /> Property Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 flex items-center justify-center text-2xl">
              {typeInfo?.emoji}
            </div>
            <div>
              <p className="font-bold text-foreground">{(formData?.get("title") as string) || "—"}</p>
              <p className="text-xs text-muted-foreground capitalize">{typeInfo?.label}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: <MapPin size={13} />,     label: "Location", value: `${formData?.get("city") || "—"}, ${formData?.get("state") || "—"}` },
              { icon: <Ruler size={13} />,       label: "Area",     value: formData?.get("area_sqft") ? `${formData.get("area_sqft")} sqft` : "—" },
              { icon: <IndianRupee size={13} />, label: "Price",    value: formData?.get("asking_price") ? `₹${Number(formData.get("asking_price")).toLocaleString("en-IN")}` : "—" },
              { icon: <ImageIcon size={13} />,   label: "Photos",   value: `${photos.length} uploaded` },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-0.5">{row.icon}</span>
                <div>
                  <p className="text-[11px] text-muted-foreground">{row.label}</p>
                  <p className="font-medium text-foreground">{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {photos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Photos by Room</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {rooms.filter(r => photos.some(p => p.roomId === r.id)).map(room => {
                const cnt = photos.filter(p => p.roomId === room.id).length;
                const ai  = photos.filter(p => p.roomId === room.id && !!p.applied).length;
                return (
                  <div key={room.id} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5 text-xs">
                    {room.emoji}
                    <span className="font-medium text-foreground">{room.label}</span>
                    <span className="text-muted-foreground">· {cnt}</span>
                    {ai > 0 && (
                      <span className="flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-semibold">
                        <Wand2 size={9} /> {ai}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40 p-4">
        <CheckCircle2 size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Listing saved as <strong>draft</strong>. Activate from the property detail page after reviewing.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft size={14} className="mr-1.5" /> Back
        </Button>
        <Button className="flex-1" size="lg" onClick={onSubmit} disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin mr-2" /> : <Home size={15} className="mr-2" />}
          List My Property
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Wizard                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
export function ListingWizard() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);

  /* Step 1 */
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [lat, setLat]   = useState("");
  const [lng, setLng]   = useState("");
  const [locating, setLocating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [descValue, setDescValue]         = useState("");
  const [descGenerating, setDescGenerating] = useState(false);

  /* Step 2 */
  const [activeRoom, setActiveRoom]       = useState("living");
  const [photos, setPhotos]               = useState<RoomPhoto[]>([]);
  const [studioPhotoId, setStudioPhotoId] = useState<string | null>(null);

  const showBuildingSpecs = propertyType !== "plot" && propertyType !== "commercial";
  const availableRooms    = ALL_ROOMS.filter(
    r => r.forTypes === "all" || (propertyType && r.forTypes.includes(propertyType as PropertyType))
  );

  /* Convert RoomPhoto → StudioPhoto for the modal */
  const studioPhoto: StudioPhoto | null = studioPhotoId
    ? (() => {
        const p = photos.find(x => x.id === studioPhotoId);
        if (!p) return null;
        const room = availableRooms.find(r => r.id === p.roomId);
        return { id: p.id, url: p.previewUrl, label: `${room?.emoji ?? ""} ${room?.label ?? ""} · ${p.file.name}`, applied: p.applied };
      })()
    : null;

  function handleStep1Next() {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!propertyType) { toast.error("Please select a property type"); return; }
    const fd = new FormData(form);
    fd.set("property_type", propertyType);
    if (lat) fd.set("latitude", lat);
    if (lng) fd.set("longitude", lng);
    setFormData(fd);
    setActiveRoom("living");
    setStep(1);
  }

  function generateDescription() {
    if (!propertyType) { toast.error("Select a property type first"); return; }
    setDescGenerating(true);
    setTimeout(() => {
      setDescValue(DESC_TEMPLATES[propertyType] ?? DESC_TEMPLATES.apartment);
      setDescGenerating(false);
      toast.success("Description generated by AI");
    }, 2200);
  }

  const addFiles = useCallback((files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const added: RoomPhoto[] = imgs.map(file => ({
      id: Math.random().toString(36).slice(2),
      file, previewUrl: URL.createObjectURL(file),
      roomId: activeRoom, applied: null,
    }));
    setPhotos(prev => [...prev, ...added]);
    toast.success(`${added.length} photo${added.length > 1 ? "s" : ""} added`);
  }, [activeRoom]);

  function removePhoto(id: string) {
    setPhotos(prev => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter(x => x.id !== id);
    });
  }

  function handleApply(photoId: string, tool: StudioTool, preset?: string, outputUrl?: string) {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, applied: { tool, preset }, outputUrl } : p));
  }

  async function handleSubmit() {
    if (!formData || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    const result = await createProperty(formData);
    setLoading(false);
    submittingRef.current = false;
    if ("error" in result) { toast.error(result.error); return; }
    toast.success("Property listed successfully!");
    router.push("/properties");
    router.refresh();
  }

  const roomPhotos = photos.filter(p => p.roomId === activeRoom);

  return (
    <div className="space-y-4">
      {/* AI Studio modal */}
      {studioPhoto && (
        <AIStudio
          photo={studioPhoto}
          onClose={() => setStudioPhotoId(null)}
          onApply={handleApply}
        />
      )}

      <StepIndicator current={step} />

      {/* ── Step 1: Details ───────────────────────────────────────────────── */}
      {step === 0 && (
        <form ref={formRef} className="space-y-5" onSubmit={e => { e.preventDefault(); handleStep1Next(); }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home size={16} className="text-primary" /> Property Details
              </CardTitle>
              <CardDescription>Basic information about your property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" name="title" placeholder="e.g. 3 BHK Apartment in Whitefield" required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="flex items-center gap-1.5">
                    <FileText size={13} className="text-muted-foreground" /> Description
                  </Label>
                  <button type="button" onClick={generateDescription} disabled={descGenerating}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors disabled:opacity-60">
                    {descGenerating
                      ? <><Loader2 size={10} className="animate-spin" /> Generating…</>
                      : <><Sparkles size={10} /> Generate with AI</>}
                  </button>
                </div>
                <textarea id="description" name="description" rows={4} maxLength={2000}
                  placeholder="Describe your property… or click Generate with AI ✨"
                  value={descValue} onChange={e => setDescValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none transition-all" />
                {descGenerating && (
                  <div className="flex items-center gap-2 text-[11px] text-violet-600 dark:text-violet-400">
                    <Sparkles size={10} className="animate-pulse" />
                    Analyzing property type and generating optimized listing description…
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Property Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt.value} type="button" onClick={() => setPropertyType(pt.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        propertyType === pt.value
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-accent",
                      )}>
                      {pt.emoji} {pt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin size={16} className="text-primary" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                  <Input id="address" name="address" placeholder="Street address" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input id="city" name="city" placeholder="e.g. Bangalore" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                  <Input id="state" name="state" placeholder="e.g. Karnataka" required />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">GPS Coordinates (optional)</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={locating}
                      onClick={() => {
                        if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
                        setLocating(true);
                        navigator.geolocation.getCurrentPosition(
                          pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setLocating(false); toast.success("Location captured!"); },
                          err  => { setLocating(false); toast.error(err.message || "Failed to get location"); },
                          { enableHighAccuracy: true, timeout: 10000 },
                        );
                      }}>
                      {locating ? <Loader2 size={12} className="animate-spin mr-1" /> : <Navigation2 size={12} className="mr-1" />}
                      Use My Location
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Latitude"  type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} />
                    <Input placeholder="Longitude" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee size={16} className="text-primary" /> Specifications & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="area_sqft" className="flex items-center gap-1.5">
                    <Ruler size={13} className="text-muted-foreground" /> Area (sq ft) <span className="text-destructive">*</span>
                  </Label>
                  <Input id="area_sqft" name="area_sqft" type="number" placeholder="1200" required min={1} />
                </div>
                {showBuildingSpecs && (<>
                  <div className="space-y-1.5">
                    <Label htmlFor="bedrooms" className="flex items-center gap-1.5">
                      <BedDouble size={13} className="text-muted-foreground" /> Bedrooms
                    </Label>
                    <Input id="bedrooms" name="bedrooms" type="number" placeholder="3" min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bathrooms" className="flex items-center gap-1.5">
                      <Bath size={13} className="text-muted-foreground" /> Bathrooms
                    </Label>
                    <Input id="bathrooms" name="bathrooms" type="number" placeholder="2" min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year_built" className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" /> Year Built
                    </Label>
                    <Input id="year_built" name="year_built" type="number" placeholder="2020" />
                  </div>
                </>)}
                <div className="space-y-1.5">
                  <Label htmlFor="asking_price" className="flex items-center gap-1.5">
                    <IndianRupee size={13} className="text-muted-foreground" /> Asking Price (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input id="asking_price" name="asking_price" type="number" placeholder="5000000" required min={1} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={!propertyType}>
            Continue to Photos <ArrowRight size={15} className="ml-2" />
          </Button>
        </form>
      )}

      {/* ── Step 2: Photo Upload ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Studio banner */}
          <div className="flex items-start gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl border border-violet-200/60 dark:border-violet-700/40 p-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Wand2 size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Image Studio</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload photos, then hover any image and click <strong>Open Studio</strong> to stage, swap objects, or compare before/after.
              </p>
            </div>
          </div>

          {/* Room selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Room</p>
            <div className="flex gap-2 flex-wrap">
              {availableRooms.map(room => {
                const count = photos.filter(p => p.roomId === room.id).length;
                return (
                  <button key={room.id} onClick={() => setActiveRoom(room.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                      activeRoom === room.id
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-accent",
                    )}>
                    {room.emoji} {room.label}
                    {count > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drop zone */}
          <label
            className="flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
          >
            <input type="file" multiple accept="image/*" className="sr-only"
              onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
            <div className="w-11 h-11 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors">
              <Upload size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Drop photos for <span className="text-primary">{availableRooms.find(r => r.id === activeRoom)?.label}</span> here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse · JPG, PNG, WEBP</p>
          </label>

          {/* Photo grid */}
          {roomPhotos.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {availableRooms.find(r => r.id === activeRoom)?.emoji}{" "}
                {availableRooms.find(r => r.id === activeRoom)?.label} · {roomPhotos.length} photo{roomPhotos.length > 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {roomPhotos.map(photo => (
                  <PhotoCard key={photo.id} photo={photo}
                    onRemove={() => removePhoto(photo.id)}
                    onOpenStudio={() => setStudioPhotoId(photo.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <span className="text-4xl">{availableRooms.find(r => r.id === activeRoom)?.emoji}</span>
              <p className="text-sm">No photos yet for this room</p>
            </div>
          )}

          {/* All uploads summary */}
          {photos.length > 0 && (
            <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">All Uploads</p>
              <div className="flex flex-wrap gap-1.5">
                {availableRooms.filter(r => photos.some(p => p.roomId === r.id)).map(r => {
                  const cnt = photos.filter(p => p.roomId === r.id).length;
                  const ai  = photos.filter(p => p.roomId === r.id && !!p.applied).length;
                  return (
                    <button key={r.id} onClick={() => setActiveRoom(r.id)}
                      className="flex items-center gap-1 bg-card border border-border rounded-lg px-2.5 py-1 text-xs hover:border-primary/40 transition-colors">
                      {r.emoji} {r.label} <span className="text-muted-foreground">({cnt})</span>
                      {ai > 0 && <Wand2 size={9} className="text-violet-500 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft size={14} className="mr-1.5" /> Back
            </Button>
            <Button className="flex-1" onClick={() => setStep(2)}>
              Review & List <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ────────────────────────────────────────────────── */}
      {step === 2 && (
        <ReviewStep
          formData={formData} photos={photos}
          propertyType={propertyType as PropertyType}
          rooms={availableRooms}
          onBack={() => setStep(1)} onSubmit={handleSubmit} loading={loading}
        />
      )}
    </div>
  );
}
