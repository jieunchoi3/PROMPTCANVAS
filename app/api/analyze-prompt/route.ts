import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiJson } from "@/lib/gemini";
import {
  PROMPT_KEYWORD_PROMPT,
  promptKeywordResultSchema,
} from "@/lib/prompt-keyword-schema";
import { requireOwner } from "@/lib/supabase/require-owner";

const requestSchema = z.object({
  prompt: z.string().trim().min(8).max(8000),
});

/** Pull technique keywords out of a pasted prompt (no image). Owner only. */
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

  try {
    const { text, model } = await callGeminiJson(
      `${PROMPT_KEYWORD_PROMPT}\n\nPrompt:\n${parsed.data.prompt}`,
    );
    const analysis = promptKeywordResultSchema.parse(JSON.parse(text));
    return NextResponse.json({ ok: true, model, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "analyze_prompt_failed";
    console.error("[analyze-prompt]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
