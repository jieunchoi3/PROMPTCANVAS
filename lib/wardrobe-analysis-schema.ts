import { z } from "zod";

export const wardrobeKeywordSchema = z.object({
  term: z.string().min(1),
  kind: z.enum(["item", "style", "color", "material", "detail"]),
  why: z.string().min(1),
});

export const wardrobeAnalysisSchema = z.object({
  summary_ko: z.string().min(1),
  item_type: z.string().min(1),
  styling_vibe: z.array(z.string().min(1)).min(1).max(6),
  colors: z.array(z.string().min(1)).min(1).max(8),
  materials: z.array(z.string().min(1)).max(6),
  details: z.array(z.string().min(1)).max(8),
  suggested_tags: z.array(z.string().min(1)).max(10),
  keywords: z.array(wardrobeKeywordSchema).max(12),
});

export type WardrobeAnalysisInput = z.infer<typeof wardrobeAnalysisSchema>;
