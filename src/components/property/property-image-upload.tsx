"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadPropertyImages,
  deletePropertyImage,
} from "@/actions/property/property";
import type { PropertyImage } from "@/lib/schema/property.schema";
import Image from "next/image";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 10;

interface PropertyImageUploadProps {
  propertyId: string;
  initialImages?: PropertyImage[];
  isOwner: boolean;
}

export function PropertyImageUpload({
  propertyId,
  initialImages = [],
  isOwner,
}: PropertyImageUploadProps) {
  const [images, setImages] = useState<PropertyImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Client-side validation
      const valid: File[] = [];
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Only JPEG, PNG, WebP, GIF allowed.`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: File too large (max 10 MB).`);
          continue;
        }
        valid.push(file);
      }

      if (images.length + valid.length > MAX_IMAGES) {
        toast.error(`Max ${MAX_IMAGES} images allowed.`);
        return;
      }

      if (valid.length === 0) return;

      setUploading(true);
      const formData = new FormData();
      valid.forEach((f) => formData.append("images", f));

      const result = await uploadPropertyImages(propertyId, formData);
      setUploading(false);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setImages((prev) => [...prev, ...result.data]);
      toast.success(
        `${result.data.length} image${result.data.length > 1 ? "s" : ""} uploaded!`
      );

      // Reset file input
      if (fileRef.current) fileRef.current.value = "";
    },
    [images.length, propertyId]
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      setDeletingId(imageId);
      const result = await deletePropertyImage(imageId);
      setDeletingId(null);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed.");
    },
    []
  );

  // Read-only gallery for non-owners
  if (!isOwner) {
    if (images.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Property Photos ({images.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border"
            >
              <Image
                src={img.image_url}
                alt="Property"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {img.is_cover && (
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={10} /> Cover
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Owner view: gallery + upload controls
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Property Photos ({images.length}/{MAX_IMAGES})
        </h3>
        {images.length < MAX_IMAGES && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : (
              <ImagePlus size={14} className="mr-1.5" />
            )}
            {uploading ? "Uploading..." : "Add Photos"}
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <ImagePlus size={24} />
          )}
          <span className="text-sm">
            {uploading
              ? "Uploading..."
              : "Click to upload property photos (max 10)"}
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border"
            >
              <Image
                src={img.image_url}
                alt="Property"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {img.is_cover && (
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={10} /> Cover
                </span>
              )}
              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === img.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <X size={12} />
                )}
              </button>
            </div>
          ))}

          {/* Add more button inline */}
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-[4/3] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ImagePlus size={18} />
              )}
              <span className="text-xs">Add more</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
