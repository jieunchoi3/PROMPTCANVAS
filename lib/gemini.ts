const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
] as const;

/** A model that hasn't answered by then gets company from the next one in the list. */
const HEDGE_DELAY_MS = 8_000;
const TOTAL_TIMEOUT_MS = 50_000;

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

async function callModel(
  model: string,
  apiKey: string,
  parts: { text?: string; inline_data?: { mime_type: string; data: string } }[],
  signal: AbortSignal,
): Promise<{ text: string; model: string }> {
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
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      signal,
    },
  );

  const raw = await r.text();
  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(raw) as GeminiResponse;
  } catch {
    throw new Error(`Invalid JSON from ${model}`);
  }
  if (!r.ok) {
    throw new Error(parsed.error?.message ?? `${model} HTTP ${r.status}`);
  }
  const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error(`${model} returned empty output`);
  return { text: stripCodeFences(text), model };
}

export async function callGeminiJson(prompt: string, image?: { mimeType: string; data: string }) {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
  }
  parts.push({ text: prompt });

  const controller = new AbortController();
  const errors: string[] = [];

  return new Promise<{ text: string; model: string }>((resolve, reject) => {
    let next = 0;
    let pending = 0;
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(totalTimer);
      controller.abort();
      fn();
    };

    const failIfDone = () => {
      if (pending === 0 && next >= GEMINI_MODELS.length) {
        finish(() => reject(new Error(errors.at(-1) ?? "All Gemini models failed")));
      }
    };

    const launch = () => {
      if (settled || next >= GEMINI_MODELS.length) return;
      const model = GEMINI_MODELS[next++]!;
      pending++;
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launch, HEDGE_DELAY_MS);
      callModel(model, apiKey, parts, controller.signal).then(
        (result) => finish(() => resolve(result)),
        (err: unknown) => {
          pending--;
          if (settled) return;
          errors.push(err instanceof Error ? err.message : String(err));
          launch();
          failIfDone();
        },
      );
    };

    const totalTimer = setTimeout(() => {
      finish(() =>
        reject(new Error("Gemini is taking too long to respond. Please try again shortly.")),
      );
    }, TOTAL_TIMEOUT_MS);

    launch();
  });
}
