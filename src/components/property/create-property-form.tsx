"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Home,
  MapPin,
  IndianRupee,
  Ruler,
  BedDouble,
  Bath,
  Calendar,
  FileText,
  Loader2,
  ArrowLeft,
  Navigation2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createProperty } from "@/actions/property/property";
import Link from "next/link";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment", emoji: "🏢" },
  { value: "independent_house", label: "Independent House", emoji: "🏠" },
  { value: "villa", label: "Villa", emoji: "🏡" },
  { value: "plot", label: "Plot / Land", emoji: "🌳" },
  { value: "commercial", label: "Commercial", emoji: "🏪" },
] as const;

export function CreatePropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyType, setPropertyType] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locating, setLocating] = useState(false);

  // Plot & commercial don't have bedrooms/bathrooms/year_built
  const showBuildingSpecs = propertyType !== "plot" && propertyType !== "commercial";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    fd.set("property_type", propertyType);
    if (lat) fd.set("latitude", lat);
    if (lng) fd.set("longitude", lng);

    const result = await createProperty(fd);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Property listed successfully!");
    router.push(`/properties`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back link */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Back to Properties
      </Link>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home size={18} className="text-primary" />
            Property Details
          </CardTitle>
          <CardDescription>Basic information about your property</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Property Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. 3 BHK Apartment in Whitefield"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <FileText size={14} className="text-muted-foreground" />
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="Describe your property..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
            />
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label>
              Property Type <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPropertyType(pt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${propertyType === pt.value
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                >
                  <span>{pt.emoji}</span>
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input id="address" name="address" placeholder="Street address" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input id="city" name="city" placeholder="e.g. Bangalore" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input id="state" name="state" placeholder="e.g. Karnataka" required />
            </div>

            {/* Lat/Lng */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">GPS Coordinates (optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={locating}
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error("Geolocation not supported by your browser.");
                      return;
                    }
                    setLocating(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setLat(pos.coords.latitude.toFixed(6));
                        setLng(pos.coords.longitude.toFixed(6));
                        setLocating(false);
                        toast.success("Location captured!");
                      },
                      (err) => {
                        setLocating(false);
                        toast.error(err.message || "Failed to get location.");
                      },
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  }}
                >
                  {locating ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <Navigation2 size={12} className="mr-1" />
                  )}
                  Use My Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <Input
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specs & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee size={18} className="text-primary" />
            Specifications & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="area_sqft" className="flex items-center gap-1.5">
                <Ruler size={14} className="text-muted-foreground" />
                Area (sq ft) <span className="text-destructive">*</span>
              </Label>
              <Input id="area_sqft" name="area_sqft" type="number" placeholder="1200" required min={1} />
            </div>
            {showBuildingSpecs && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="bedrooms" className="flex items-center gap-1.5">
                    <BedDouble size={14} className="text-muted-foreground" />
                    Bedrooms
                  </Label>
                  <Input id="bedrooms" name="bedrooms" type="number" placeholder="3" min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bathrooms" className="flex items-center gap-1.5">
                    <Bath size={14} className="text-muted-foreground" />
                    Bathrooms
                  </Label>
                  <Input id="bathrooms" name="bathrooms" type="number" placeholder="2" min={0} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year_built" className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-muted-foreground" />
                    Year Built
                  </Label>
                  <Input id="year_built" name="year_built" type="number" placeholder="2020" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="lot_size">Lot Size (sq ft)</Label>
              <Input id="lot_size" name="lot_size" type="number" placeholder="2000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asking_price" className="flex items-center gap-1.5">
                <IndianRupee size={14} className="text-muted-foreground" />
                Asking Price (₹) <span className="text-destructive">*</span>
              </Label>
              <Input id="asking_price" name="asking_price" type="number" placeholder="5000000" required min={1} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={loading || !propertyType}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin mr-2" />
        ) : (
          <Home size={18} className="mr-2" />
        )}
        List Property
      </Button>
    </form>
  );
}
