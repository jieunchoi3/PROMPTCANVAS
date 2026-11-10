import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiJson } from "@/lib/gemini";
import { requireOwner } from "@/lib/supabase/require-owner";

const requestSchema = z.object({
  texts: z.array(z.string().min(1).max(6000)).min(1).max(60),
});

const responseSchema = z.object({
  translations: z.array(z.string()),
});

const TRANSLATE_PROMPT = `You translate the Korean parts of short texts from an AI image-generation reference library into natural English.
Rules:
- Translate every Korean word or sentence into English. Leave text that is already English unchanged.
- Keep line breaks, markdown (**bold**, lists), punctuation, numbers, model names and prompt syntax exactly as they are.
- Category labels and keywords should stay short (a few words), like a UI label.
- Korean personal names should be romanized (e.g. 유나 → Yuna).
Return JSON: {"translations": [...]} with exactly one translated string per input, in the same order.

Input JSON array:
`;

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
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { texts } = parsed.data;
  try {
    const { text } = await callGeminiJson(TRANSLATE_PROMPT + JSON.stringify(texts));
    const { translations } = responseSchema.parse(JSON.parse(text));
    if (translations.length !== texts.length) {
      throw new Error("translation_count_mismatch");
    }
    return NextResponse.json({ ok: true, translations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "translate_failed";
    console.error("[translate]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
