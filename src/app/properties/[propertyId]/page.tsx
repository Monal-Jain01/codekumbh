import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, BedDouble, Bath, Ruler, IndianRupee, Calendar,
  ArrowLeft, Home, User, Clock, Phone, ArrowRight,
} from "lucide-react";
import { MakeOfferForm } from "@/components/property/make-offer-form";
import { PropertyContextCard } from "@/components/property/property-context-card";
import { PropertyImageUpload } from "@/components/property/property-image-upload";
import { PropertyImageGallery } from "@/components/property/property-image-gallery";
import { OfferActions } from "@/components/property/offer-actions";
import { PropertyStatusManager } from "@/components/property/property-status-manager";
import { RealtimeOfferListener, RealtimeContextListener } from "@/components/property/realtime-listeners";
import { AIValuationCard } from "@/components/property/ai-valuation-card";
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

  // Fetch buyer's own offers on this property (non-owner view)
  let myOffers: Offer[] = [];
  if (!isOwner) {
    const { data: myOfferData } = await supabase
      .from("offers")
      .select("*")
      .eq("property_id", propertyId)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    myOffers = (myOfferData ?? []) as Offer[];
  }

  // Fetch property images
  const { data: propertyImages } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("display_order", { ascending: true });
  const images = (propertyImages ?? []) as PropertyImage[];
  const coverImage = images.find((img) => img.is_cover) ?? images[0] ?? null;

  // Fetch similar properties (same city, different id)
  const { data: similarData } = await supabase
    .from("properties")
    .select("id, title, property_type, city, state, asking_price, area_sqft, bedrooms")
    .eq("is_active", true)
    .eq("city", p.city ?? "")
    .neq("id", p.id)
    .limit(3);
  const similarProperties = (similarData ?? []) as Pick<
    Property,
    "id" | "title" | "property_type" | "city" | "state" | "asking_price" | "area_sqft" | "bedrooms"
  >[];

  // Fetch cover images for similar properties
  const similarIds = similarProperties.map((s) => s.id);
  const { data: simImages } = similarIds.length
    ? await supabase
        .from("property_images")
        .select("property_id, image_url")
        .in("property_id", similarIds)
        .eq("is_cover", true)
    : { data: [] };
  const simCoverMap: Record<string, string> = {};
  for (const img of simImages ?? []) {
    simCoverMap[(img as { property_id: string; image_url: string }).property_id] =
      (img as { property_id: string; image_url: string }).image_url;
  }

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
                          offerPrice={Number(offer.offer_price)}
                          counterPrice={offer.counter_price ?? null}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Neighbourhood Intelligence */}
            <PropertyContextCard context={propertyContext ?? null} city={p.city} propertyType={p.property_type} />

            {/* Similar Properties */}
            {similarProperties.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    Similar Properties in {p.city}
                  </h2>
                  <Link
                    href={`/properties?city=${p.city}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {similarProperties.map((sp) => (
                    <Link
                      key={sp.id}
                      href={`/properties/${sp.id}`}
                      className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all hover:shadow-md"
                    >
                      {/* Cover image */}
                      <div className="relative h-32 bg-muted overflow-hidden">
                        {simCoverMap[sp.id] ? (
                          <Image
                            src={simCoverMap[sp.id]}
                            alt={sp.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="220px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/30">
                            🏠
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/50 text-white capitalize">
                            {sp.property_type?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {sp.title}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={10} />
                          {sp.city}, {sp.state}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs font-bold text-foreground flex items-center gap-0.5">
                            <IndianRupee size={10} />
                            {sp.asking_price
                              ? Number(sp.asking_price) >= 10_000_000
                                ? (Number(sp.asking_price) / 10_000_000).toFixed(1) + " Cr"
                                : (Number(sp.asking_price) / 100_000).toFixed(0) + " L"
                              : "—"}
                          </p>
                          {sp.bedrooms != null && sp.bedrooms > 0 && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <BedDouble size={10} /> {sp.bedrooms} BHK
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 self-start sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Price Card */}
            <div className="bg-card rounded-xl border border-border p-5">
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

                  {/* My Offers — status tracker */}
                  {myOffers.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Your Offers
                      </p>
                      {myOffers.map((o) => (
                        <div key={o.id} className="bg-muted/40 rounded-lg px-3 py-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-foreground flex items-center gap-0.5">
                                <IndianRupee size={10} />
                                {Number(o.offer_price).toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              o.status === "accepted"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : o.status === "rejected"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : o.status === "countered"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            }`}>
                              {o.status === "pending" ? "⏳ Awaiting"
                                : o.status === "accepted" ? "✓ Accepted"
                                : o.status === "countered" ? "↔ Countered"
                                : "✗ Rejected"}
                            </span>
                          </div>
                          {o.status === "countered" && o.counter_price && (
                            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-md px-2 py-1.5">
                              <ArrowRight size={10} className="text-amber-600" />
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                Owner&apos;s counter: <span className="font-bold">₹{Number(o.counter_price).toLocaleString("en-IN")}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                      {myOffers.some(o => o.status === "accepted") && ownerPhone && (
                        <a href={`tel:${ownerPhone}`}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 hover:underline">
                          <Phone size={11} /> Call owner to proceed
                        </a>
                      )}
                    </div>
                  )}
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

            {/* AI Valuation Card */}
            <AIValuationCard
              askingPrice={p.asking_price ? Number(p.asking_price) : null}
              propertyType={p.property_type}
              city={p.city}
              areaSqft={p.area_sqft ? Number(p.area_sqft) : null}
            />
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
