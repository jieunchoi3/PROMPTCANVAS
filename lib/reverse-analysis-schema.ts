import { z } from "zod";

const sectionKeys = [
  "subject",
  "pose_composition",
  "camera_lens",
  "lighting",
  "colour",
  "style_texture",
  "background",
  "mood",
] as const;

export const reverseKeywordSchema = z.object({
  term: z.string().min(1),
  section: z.enum(sectionKeys),
  kind: z.enum([
    "camera",
    "lighting",
    "style",
    "colour",
    "pose",
    "subject",
    "effect",
    "free",
  ]),
  why: z.string().min(1),
});

export const reverseAnalysisSchema = z.object({
  summary_ko: z.string().min(1),
  sections: z.object({
    subject: z.string().min(1),
    pose_composition: z.string().min(1),
    camera_lens: z.string().min(1),
    lighting: z.string().min(1),
    colour: z.string().min(1),
    style_texture: z.string().min(1),
    background: z.string().min(1),
    mood: z.string().min(1),
  }),
  keywords: z.array(reverseKeywordSchema).min(1).max(20),
  suggested_tags: z.array(z.string().min(1)).max(16),
  final_prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
});

export type ReverseAnalysis = z.infer<typeof reverseAnalysisSchema>;

export function filterValidKeywords(analysis: ReverseAnalysis): ReverseAnalysis {
  const keywords = analysis.keywords.filter((kw) => {
    const sectionText = analysis.sections[kw.section]?.toLowerCase() ?? "";
    return sectionText.includes(kw.term.toLowerCase());
  });
  return { ...analysis, keywords };
}

export const REVERSE_ANALYSIS_PROMPT = `You are an expert AI image generation analyst. Study the image and return strict JSON only (no markdown).

Schema:
{
  "summary_ko": "한 줄 한국어 요약",
  "sections": {
    "subject": "who/what, wardrobe, styling (English)",
    "pose_composition": "framing, crop, angle (English)",
    "camera_lens": "focal length, aperture feel, distance (English)",
    "lighting": "key/fill, modifier, direction, contrast (English)",
    "colour": "palette, grading, saturation (English)",
    "style_texture": "rendering style, grain, era (English)",
    "background": "environment, depth (English)",
    "mood": "5-10 word vibe (English)"
  },
  "keywords": [
    { "term": "exact phrase from a section", "section": "lighting", "kind": "lighting|camera|colour|pose|style|subject|effect|free", "why": "짧은 한국어 설명" }
  ],
  "suggested_tags": ["macro", "high-key"],
  "final_prompt": "dense English generation prompt, 60-120 words, paste-ready",
  "negative_prompt": "optional English negative prompt"
}

Rules:
- Section values in English. keywords[].why in Korean.
- Every keywords[].term MUST appear verbatim (case-insensitive) inside the named section text.
- 8-16 keywords. Prefer technique vocabulary over content nouns.
- Never name real people.
- final_prompt must be self-contained, no bullet points.`;
