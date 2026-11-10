import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiJson } from "@/lib/gemini";
import { requireOwner } from "@/lib/supabase/require-owner";
import { wardrobeAnalysisSchema } from "@/lib/wardrobe-analysis-schema";

const requestSchema = z.object({
  assetId: z.string().uuid(),
  imageBase64: z.string().min(32),
  mimeType: z.string().optional(),
});

const WARDROBE_PROMPT = `You classify fashion/outfit inspiration images for a personal wardrobe library.
Return strict JSON only:
{
  "summary_ko": "한 줄 한국어 설명",
  "item_type": "top|bottom|dress|outer|set|bag|shoes|accessory",
  "styling_vibe": ["y2k","street"],
  "colors": ["black","pink"],
  "materials": ["denim","leather"],
  "details": ["pleated","sheer"],
  "suggested_tags": ["casual","mini skirt"],
  "keywords": [{ "term": "...", "kind": "item|style|color|material|detail", "why": "한국어" }]
}
Use English slugs for arrays. summary_ko and keywords[].why in Korean.`;

export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const mimeType =
    parsed.data.mimeType?.startsWith("image/") ? parsed.data.mimeType : "image/jpeg";

  try {
    const { text, model } = await callGeminiJson(WARDROBE_PROMPT, { mimeType, data });
    const analysis = wardrobeAnalysisSchema.parse(JSON.parse(text));
    return NextResponse.json({
      ok: true,
      assetId: parsed.data.assetId,
      model,
      analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "wardrobe_analyze_failed";
    console.error("[analyze-wardrobe]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
