"use server";

import { tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@/lib/supabase/server";
import {
  createPropertySchema,
  makeOfferSchema,
  type Property,
  type Offer,
  type PropertyImage,
} from "@/lib/schema/property.schema";
import { uploadFile, deleteFile, getPublicUrl } from "@/lib/supabase/storage";
import type { generatePropertyValuation } from "@/trigger/property-valuation";
import type { enrichPropertyContext } from "@/trigger/property-context";
import type { generateInvestmentInsights } from "@/trigger/investment-insights";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, userId: null };
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// 1. CREATE PROPERTY
// ---------------------------------------------------------------------------

export async function createProperty(
  formData: FormData
): Promise<{ data: Property } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = createPropertySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    property_type: formData.get("property_type"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    country: formData.get("country") || "India",
    area_sqft: Number(formData.get("area_sqft")),
    bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : undefined,
    bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : undefined,
    year_built: formData.get("year_built") ? Number(formData.get("year_built")) : undefined,
    lot_size: formData.get("lot_size") ? Number(formData.get("lot_size")) : undefined,
    asking_price: Number(formData.get("asking_price")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      property_type: parsed.data.property_type,
      status: "active",
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
      area_sqft: parsed.data.area_sqft,
      bedrooms: parsed.data.bedrooms ?? null,
      bathrooms: parsed.data.bathrooms ?? null,
      year_built: parsed.data.year_built ?? null,
      lot_size: parsed.data.lot_size ?? null,
      asking_price: parsed.data.asking_price,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  // ── Auto-trigger 3 AI background tasks on property creation ──────
  const propertyPayload = {
    title: parsed.data.title,
    property_type: parsed.data.property_type,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    country: parsed.data.country,
    area_sqft: parsed.data.area_sqft,
    bedrooms: parsed.data.bedrooms ?? null,
    bathrooms: parsed.data.bathrooms ?? null,
    asking_price: parsed.data.asking_price,
    description: parsed.data.description || null,
  };

  try {
    // 1. AI Property Valuation
    await tasks.trigger<typeof generatePropertyValuation>(
      "generate-property-valuation",
      {
        propertyId: data.id,
        userId,
        propertyData: {
          ...propertyPayload,
          year_built: parsed.data.year_built ?? null,
          lot_size: parsed.data.lot_size ?? null,
        },
      }
    );

    // 2. Property Context Enrichment
    await tasks.trigger<typeof enrichPropertyContext>(
      "enrich-property-context",
      {
        propertyId: data.id,
        propertyData: propertyPayload,
      }
    );

    // 3. Investment Insights
    await tasks.trigger<typeof generateInvestmentInsights>(
      "generate-investment-insights",
      {
        propertyId: data.id,
        userId,
        propertyData: propertyPayload,
      }
    );
  } catch (triggerErr) {
    // Don't fail the property creation if triggers fail
    console.error("Failed to trigger background AI tasks:", triggerErr);
  }

  return { data: data as Property };
}

// ---------------------------------------------------------------------------
// 2. GET ALL ACTIVE PROPERTIES (browse)
// ---------------------------------------------------------------------------

export async function getActiveProperties(): Promise<
  { data: Property[] } | { error: string }
> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}

// ---------------------------------------------------------------------------
// 3. GET MY PROPERTIES (seller view)
// ---------------------------------------------------------------------------

export async function getMyProperties(): Promise<
  { data: Property[] } | { error: string }
> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}

// ---------------------------------------------------------------------------
// 4. GET SINGLE PROPERTY
// ---------------------------------------------------------------------------

export async function getProperty(
  propertyId: string
): Promise<{ data: Property } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (error) return { error: error.message };
  return { data: data as Property };
}

// ---------------------------------------------------------------------------
// 5. MAKE OFFER
// ---------------------------------------------------------------------------

export async function makeOffer(
  formData: FormData
): Promise<{ data: Offer } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  const parsed = makeOfferSchema.safeParse({
    property_id: formData.get("property_id"),
    offer_price: Number(formData.get("offer_price")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data, error } = await supabase
    .from("offers")
    .insert({
      property_id: parsed.data.property_id,
      buyer_id: userId,
      offer_price: parsed.data.offer_price,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { data: data as Offer };
}

// ---------------------------------------------------------------------------
// 6. GET OFFERS FOR A PROPERTY (seller view)
// ---------------------------------------------------------------------------

export async function getPropertyOffers(
  propertyId: string
): Promise<{ data: Offer[] } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as Offer[] };
}

// ---------------------------------------------------------------------------
// 7. REQUEST AI VALUATION
// ---------------------------------------------------------------------------

export async function requestValuation(
  propertyId: string
): Promise<{ success: true; runId: string; publicToken: string } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  // Fetch property
  const { data: property, error: fetchErr } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();
  if (fetchErr || !property) return { error: "Property not found" };

  // Import trigger deps dynamically
  const { auth, tasks } = await import("@trigger.dev/sdk/v3");
  const { generatePropertyValuation } = await import("@/trigger/property-valuation");

  const handle = await tasks.trigger<typeof generatePropertyValuation>(
    "generate-property-valuation",
    {
      propertyId,
      userId,
      propertyData: {
        title: property.title,
        property_type: property.property_type,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        area_sqft: property.area_sqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        year_built: property.year_built,
        lot_size: property.lot_size,
        asking_price: property.asking_price,
        description: property.description,
      },
    }
  );

  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  });

  return { success: true, runId: handle.id, publicToken };
}

// ---------------------------------------------------------------------------
// 8. SEARCH PROPERTIES
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 9. UPLOAD PROPERTY IMAGES
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES_PER_PROPERTY = 10;

export async function uploadPropertyImages(
  propertyId: string,
  formData: FormData
): Promise<{ data: PropertyImage[] } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  // Verify user owns this property
  const { data: prop } = await supabase
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();
  if (!prop || prop.owner_id !== userId) return { error: "You don't own this property." };

  // Check existing image count
  const { count } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const files = formData.getAll("images") as File[];
  if (!files.length) return { error: "No files provided." };

  const existingCount = count ?? 0;
  if (existingCount + files.length > MAX_IMAGES_PER_PROPERTY) {
    return { error: `Max ${MAX_IMAGES_PER_PROPERTY} images allowed. You have ${existingCount}.` };
  }

  // Validate all files first
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { error: `Invalid file type: ${file.name}. Only JPEG, PNG, WebP, GIF allowed.` };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { error: `${file.name} is too large. Max 10 MB.` };
    }
  }

  const uploaded: PropertyImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${propertyId}/${Date.now()}_${i}.${ext}`;

    try {
      const { publicUrl } = await uploadFile(supabase, file, {
        bucket: "property-images",
        path: storagePath,
        upsert: true,
      });

      const { data: row, error: dbErr } = await supabase
        .from("property_images")
        .insert({
          property_id: propertyId,
          image_url: publicUrl,
          storage_path: storagePath,
          display_order: existingCount + i,
          is_cover: existingCount === 0 && i === 0, // first image = cover
        })
        .select("*")
        .single();

      if (dbErr || !row) {
        console.error("Failed to save image record:", dbErr);
        continue;
      }

      uploaded.push(row as PropertyImage);
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
    }
  }

  if (uploaded.length === 0) return { error: "Failed to upload any images." };
  return { data: uploaded };
}

// ---------------------------------------------------------------------------
// 10. DELETE PROPERTY IMAGE
// ---------------------------------------------------------------------------

export async function deletePropertyImage(
  imageId: string
): Promise<{ success: true } | { error: string }> {
  const { supabase, userId } = await getAuthenticatedUser();
  if (!supabase || !userId) return { error: "UNAUTHORIZED" };

  // Fetch the image row + verify ownership via property
  const { data: image } = await supabase
    .from("property_images")
    .select("id, property_id, storage_path")
    .eq("id", imageId)
    .single();
  if (!image) return { error: "Image not found." };

  const { data: prop } = await supabase
    .from("properties")
    .select("owner_id")
    .eq("id", image.property_id)
    .single();
  if (!prop || prop.owner_id !== userId) return { error: "Not authorized." };

  // Delete from storage
  try {
    await deleteFile(supabase, "property-images", image.storage_path);
  } catch {
    // Non-fatal — file may already be gone
  }

  // Delete from DB
  const { error: dbErr } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId);
  if (dbErr) return { error: dbErr.message };

  return { success: true };
}

// ---------------------------------------------------------------------------
// 11. GET PROPERTY IMAGES
// ---------------------------------------------------------------------------

export async function getPropertyImages(
  propertyId: string
): Promise<{ data: PropertyImage[] } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("display_order", { ascending: true });

  if (error) return { error: error.message };
  return { data: (data ?? []) as PropertyImage[] };
}

// ---------------------------------------------------------------------------
// 12. SEARCH PROPERTIES
// ---------------------------------------------------------------------------

export async function searchProperties(
  query: string
): Promise<{ data: Property[] } | { error: string }> {
  const { supabase } = await getAuthenticatedUser();
  if (!supabase) return { error: "UNAUTHORIZED" };

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .or(
      `title.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%,address.ilike.%${query}%,property_type.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { data: (data ?? []) as Property[] };
}
