import { NextResponse } from "next/server";
import { z } from "zod";
import { wardrobeAnalysisSchema } from "@/lib/wardrobe-analysis-schema";

const requestSchema = z.object({
  assetId: z.string().uuid(),
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

  return NextResponse.json({
    ok: false,
    assetId: parsed.data.assetId,
    status: "not_implemented",
    fields: Object.keys(wardrobeAnalysisSchema.shape),
    contract: {
      summary_ko: "string",
      item_type: "string",
      styling_vibe: ["string"],
      colors: ["string"],
      materials: ["string"],
      details: ["string"],
      suggested_tags: ["string"],
      keywords: [{ term: "string", kind: "item|style|color|material|detail", why: "string" }],
    },
    message:
      "Wardrobe auto classification is intentionally scaffolded only for now. Plug a server-side vision model into this route later.",
  });
}
