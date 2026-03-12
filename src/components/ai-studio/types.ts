export type StudioTool = "stage" | "objects" | "organise" | "enhance" | "compare";

export interface StudioPhoto {
  id: string;
  /** Blob URL (listing wizard) or remote URL (property detail) */
  url: string;
  label: string;
  applied: { tool: StudioTool; preset?: string } | null;
}
