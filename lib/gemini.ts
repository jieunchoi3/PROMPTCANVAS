const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string; status?: string };
};

export function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return t.trim();
}

export async function callGeminiJson(prompt: string, image?: { mimeType: string; data: string }) {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  let lastError = "All Gemini models failed";

  for (const model of GEMINI_MODELS) {
    try {
      const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [];
      if (image) {
        parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
      }
      parts.push({ text: prompt });

      // Auth keys (AQ.*) and current Gemini API docs require x-goog-api-key header.
      // Query ?key= still works for older AIza keys, but fails for AQ. auth keys.
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const raw = await r.text();
      let parsed: GeminiResponse;
      try {
        parsed = JSON.parse(raw) as GeminiResponse;
      } catch {
        lastError = `Invalid JSON from ${model}`;
        continue;
      }

      if (!r.ok) {
        lastError = parsed.error?.message ?? `${model} HTTP ${r.status}`;
        continue;
      }

      const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) return { text: stripCodeFences(text), model };
      lastError = `${model} returned empty output`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError);
}
