import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  IndianRupee,
  Calendar,
  ArrowLeft,
  Home,
  User,
  Clock,
  Phone,
} from "lucide-react";
import { MakeOfferForm } from "@/components/property/make-offer-form";
import { PropertyContextCard } from "@/components/property/property-context-card";
import { PropertyImageUpload } from "@/components/property/property-image-upload";
import { PropertyImageGallery } from "@/components/property/property-image-gallery";
import { OfferActions } from "@/components/property/offer-actions";
import { PropertyStatusManager } from "@/components/property/property-status-manager";
import { RealtimeOfferListener, RealtimeContextListener } from "@/components/property/realtime-listeners";
import type { Property, PropertyImage, Offer } from "@/lib/schema/property.schema";

interface Props {
  params: Promise<{ propertyId: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { propertyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (error || !property) notFound();

  const p = property as Property;
  const isOwner = user.id === p.owner_id;

  // Fetch offers if owner (include buyer profiles)
  let offers: (Offer & { buyer_name?: string; buyer_phone?: string })[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from("offers")
      .select("*, profiles:buyer_id(full_name, phone)")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    offers = ((data ?? []) as Array<Offer & { profiles: { full_name: string | null; phone: string | null } | null }>).map((o) => ({
      ...o,
      buyer_name: o.profiles?.full_name ?? undefined,
      buyer_phone: o.profiles?.phone ?? undefined,
    }));
  }

  // Fetch owner profile (name + phone)
  let ownerName = "Unknown";
  let ownerPhone: string | null = null;
  if (p.owner_id) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", p.owner_id)
      .single();
    ownerName = ownerProfile?.full_name ?? "Unknown";
    ownerPhone = ownerProfile?.phone ?? null;
  }

  // Fetch property context (neighbourhood data)
  const { data: propertyContext } = await supabase
    .from("property_context")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch property images
  const { data: propertyImages } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("display_order", { ascending: true });
  const images = (propertyImages ?? []) as PropertyImage[];
  const coverImage = images.find((img) => img.is_cover) ?? images[0] ?? null;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Supabase Realtime Listeners */}
      <RealtimeContextListener propertyId={p.id} />
      {isOwner && <RealtimeOfferListener propertyId={p.id} />}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Properties
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery with AI Studio — all users */}
            <PropertyImageGallery
              images={images}
              propertyTitle={p.title}
              propertyType={p.property_type ?? ""}
            />

            {/* Image management — owner only */}
            {isOwner && (
              <div className="bg-card rounded-xl border border-border p-5">
                <PropertyImageUpload
                  propertyId={p.id}
                  initialImages={images}
                  isOwner={isOwner}
                />
              </div>
            )}

            {/* Title + Meta */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                  {p.property_type?.replace("_", " ")}
                </span>
                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                  {p.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {p.title}
              </h1>
              <p className="flex items-center gap-1.5 text-muted-foreground mt-1">
                <MapPin size={15} />
                {p.address}, {p.city}, {p.state}
              </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SpecCard icon={<Ruler size={18} />} label="Area" value={p.area_sqft ? `${p.area_sqft} sqft` : "—"} />
              <SpecCard icon={<BedDouble size={18} />} label="Bedrooms" value={p.bedrooms?.toString() ?? "—"} />
              <SpecCard icon={<Bath size={18} />} label="Bathrooms" value={p.bathrooms?.toString() ?? "—"} />
              <SpecCard icon={<Calendar size={18} />} label="Year Built" value={p.year_built?.toString() ?? "—"} />
            </div>

            {/* Description */}
            {p.description && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Description
                </h2>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {p.description}
                </p>
              </div>
            )}

            {/* Offers (owner only) */}
            {isOwner && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Offers Received ({offers.length})
                </h2>
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No offers yet.</p>
                ) : (
                  <div className="space-y-3">
                    {offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <IndianRupee size={13} />
                            {Number(offer.offer_price).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} />
                            {new Date(offer.created_at).toLocaleDateString("en-IN")}
                            {offer.buyer_name && (
                              <span className="ml-1">· {offer.buyer_name}</span>
                            )}
                          </p>
                        </div>
                        <OfferActions
                          offerId={offer.id}
                          status={offer.status}
                          buyerName={offer.buyer_name}
                          buyerPhone={offer.buyer_phone}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Neighbourhood Intelligence */}
            <PropertyContextCard context={propertyContext ?? null} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className="bg-card rounded-xl border border-border p-5 sticky top-24">
              <p className="text-sm text-muted-foreground mb-1">Asking Price</p>
              <p className="flex items-center gap-0.5 text-3xl font-bold text-foreground">
                <IndianRupee size={24} />
                {p.asking_price
                  ? Number(p.asking_price).toLocaleString("en-IN")
                  : "—"}
              </p>
              {p.area_sqft && p.asking_price && (
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{Math.round(Number(p.asking_price) / Number(p.area_sqft)).toLocaleString("en-IN")} / sqft
                </p>
              )}

              <div className="border-t border-border my-4" />

              {/* Owner info */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ownerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {isOwner ? "You (Owner)" : "Property Owner"}
                  </p>
                </div>
              </div>

              {/* Owner phone (non-owner view) */}
              {!isOwner && ownerPhone && (
                <a
                  href={`tel:${ownerPhone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
                >
                  <Phone size={14} />
                  {ownerPhone}
                </a>
              )}

              {/* Make Offer (non-owner) */}
              {!isOwner && (
                <>
                  <div className="border-t border-border my-4" />
                  <MakeOfferForm propertyId={p.id} askingPrice={p.asking_price} />
                </>
              )}

              {isOwner && (
                <>
                  <div className="border-t border-border my-4" />
                  <PropertyStatusManager propertyId={p.id} currentStatus={p.status ?? "draft"} />
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground mt-4">
                    <Home size={13} className="inline mr-1" />
                    This is your property listing. Offers will appear above.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Spec Card ────────────────────────────────────────────────────────── */
function SpecCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
