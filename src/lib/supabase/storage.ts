/**
 * Supabase Storage utilities — server-side only.
 *
 * Intended usage:
 *   import { uploadFile, deleteFile, getPublicUrl } from "@/lib/supabase/storage"
 *
 * The helpers accept a Supabase client instance so they work with both the
 * server client (Server Actions) and the admin client (Trigger.dev tasks).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  path: string;         // storage path — store this in the DB
  publicUrl: string;    // CDN URL to serve to the browser
}

export interface UploadOptions {
  /** Storage bucket name. Defaults to "avatars". */
  bucket?: string;
  /**
   * Custom storage path. If omitted, defaults to:
   *   `<folder>/<timestamp>_<sanitised-filename>`
   */
  path?: string;
  /** Top-level folder inside the bucket (used when `path` is auto-generated). */
  folder?: string;
  /** When true, any existing file at the path is overwritten. Default: true. */
  upsert?: boolean;
}

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------

/**
 * Upload a `File` (or `Blob`) to Supabase Storage.
 *
 * @example
 * const file = formData.get("avatar") as File
 * const { path, publicUrl } = await uploadFile(supabase, file, { bucket: "avatars", folder: userId })
 */
export async function uploadFile(
  supabase: SupabaseClient,
  file: File | Blob,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    bucket = "avatars",
    folder = "uploads",
    upsert = true,
  } = options;

  const fileName = file instanceof File ? file.name : "blob";
  const sanitised = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = options.path ?? `${folder}/${Date.now()}_${sanitised}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      upsert,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const publicUrl = getPublicUrl(supabase, bucket, storagePath);
  return { path: storagePath, publicUrl };
}

// ---------------------------------------------------------------------------
// deleteFile
// ---------------------------------------------------------------------------

/**
 * Delete one or more files from a storage bucket.
 *
 * @example
 * await deleteFile(supabase, "avatars", "user-id/old-avatar.png")
 */
export async function deleteFile(
  supabase: SupabaseClient,
  bucket: string,
  paths: string | string[]
): Promise<void> {
  const pathList = Array.isArray(paths) ? paths : [paths];
  const { error } = await supabase.storage.from(bucket).remove(pathList);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// getPublicUrl
// ---------------------------------------------------------------------------

/**
 * Build the CDN public URL for an already-uploaded storage path.
 * Does NOT make a network request — returns synchronously.
 *
 * @example
 * const url = getPublicUrl(supabase, "avatars", "user-id/avatar.png")
 */
export function getPublicUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// extractStoragePath
// ---------------------------------------------------------------------------

/**
 * Given a full Supabase CDN URL, extract the relative storage path.
 * Useful for finding the path to delete when you only have the stored URL.
 *
 * @example
 * const path = extractStoragePath(
 *   "https://<ref>.supabase.co/storage/v1/object/public/avatars/user-id/photo.png",
 *   "avatars"
 * )
 * // → "user-id/photo.png"
 */
export function extractStoragePath(publicUrl: string, bucket: string): string {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) throw new Error("URL does not match expected Supabase storage pattern");
  return publicUrl.slice(idx + marker.length);
}
