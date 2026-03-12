import { z } from "zod";

// --- Create / update a property listing ---
export const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  property_type: z.enum(
    ["apartment", "independent_house", "villa", "plot", "commercial"] as const,
    { message: "Select a property type" }
  ),
  status: z.enum(["draft", "active", "sold", "rented"] as const).default("draft"),
  address: z.string().min(1, "Address is required").max(300),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  country: z.string().max(100).default("India"),
  area_sqft: z.number({ message: "Area must be a number" }).positive("Area must be positive"),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  year_built: z.number().int().min(1800).max(2030).optional(),
  lot_size: z.number().positive().optional(),
  asking_price: z
    .number({ message: "Price must be a number" })
    .positive("Price must be positive"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// --- Make an offer on a property ---
export const makeOfferSchema = z.object({
  property_id: z.string().uuid(),
  offer_price: z
    .number({ message: "Offer price must be a number" })
    .positive("Offer price must be positive"),
});
export type MakeOfferInput = z.infer<typeof makeOfferSchema>;

// --- Property row shape from DB ---
export const PropertySchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  property_type: z.string().nullable(),
  status: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  area_sqft: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  year_built: z.number().nullable(),
  lot_size: z.number().nullable(),
  asking_price: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type Property = z.infer<typeof PropertySchema>;

// --- AI Property Valuation row shape from DB ---
export const ValuationSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid().nullable(),
  requested_by: z.string().uuid().nullable(),
  model_provider: z.string().nullable(),
  model_name: z.string().nullable(),
  predicted_price: z.number().nullable(),
  price_range_low: z.number().nullable(),
  price_range_high: z.number().nullable(),
  confidence_score: z.number().nullable(),
  reasoning: z.string().nullable(),
  structured_factors: z.any().nullable(),
  raw_prompt: z.any().nullable(),
  raw_response: z.any().nullable(),
  created_at: z.string(),
});
export type Valuation = z.infer<typeof ValuationSchema>;

// --- Offer row shape from DB ---
export const OfferSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid().nullable(),
  buyer_id: z.string().uuid().nullable(),
  offer_price: z.number(),
  counter_price: z.number().nullable(),
  status: z.string(),
  ai_risk_score: z.number().nullable(),
  ai_recommendation: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type Offer = z.infer<typeof OfferSchema>;

// --- Property Image row shape from DB ---
export const PropertyImageSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  image_url: z.string(),
  storage_path: z.string(),
  display_order: z.number(),
  is_cover: z.boolean(),
  created_at: z.string(),
});
export type PropertyImage = z.infer<typeof PropertyImageSchema>;
