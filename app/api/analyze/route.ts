import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiJson } from "@/lib/gemini";
import {
  REVERSE_ANALYSIS_PROMPT,
  filterValidKeywords,
  reverseAnalysisSchema,
} from "@/lib/reverse-analysis-schema";

const requestSchema = z.object({
  assetId: z.string().uuid(),
  imageBase64: z.string().min(32),
  mimeType: z.string().optional(),
});

export async function POST(request: Request) {
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
    const { text, model } = await callGeminiJson(REVERSE_ANALYSIS_PROMPT, {
      mimeType,
      data,
    });
    const raw = reverseAnalysisSchema.parse(JSON.parse(text));
    const analysis = filterValidKeywords(raw);
    return NextResponse.json({
      ok: true,
      assetId: parsed.data.assetId,
      model,
      analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "analyze_failed";
    console.error("[analyze]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
