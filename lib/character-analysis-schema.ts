import { z } from "zod";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";

function optionValues(key: string): [string, ...string[]] {
  const opts = CHARACTER_ATTRIBUTES.find((a) => a.key === key)?.options.map((o) => o.value) ?? [];
  if (opts.length === 0) throw new Error(`missing options for ${key}`);
  return opts as [string, ...string[]];
}

export const characterAnalysisSchema = z.object({
  summary_ko: z.string().min(1),
  gender: z.enum(optionValues("gender")),
  ethnicity: z.enum(optionValues("ethnicity")),
  age_band: z.enum(optionValues("age_band")),
  hair: z.array(z.enum(optionValues("hair"))).max(4),
  build: z.enum(optionValues("build")).nullable(),
  vibe: z.array(z.enum(optionValues("vibe"))).max(4),
  wardrobe: z.array(z.enum(optionValues("wardrobe"))).max(4),
});

export type CharacterAnalysis = z.infer<typeof characterAnalysisSchema>;

function catalogBlock(): string {
  return CHARACTER_ATTRIBUTES.map((attr) => {
    const values = attr.options.map((o) => `${o.value} (${o.label})`).join(", ");
    return `- ${attr.key}${attr.multi ? "[]" : ""}: ${values}`;
  }).join("\n");
}

export const CHARACTER_ANALYSIS_PROMPT = `You classify a person/character reference photo for a personal AI prompt library.
Return strict JSON only (no markdown):
{
  "summary_ko": "한 줄 한국어 설명",
  "gender": "female",
  "ethnicity": "east-asian",
  "age_band": "20s",
  "hair": ["long straight", "bangs"],
  "build": "slim",
  "vibe": ["cute", "editorial"],
  "wardrobe": ["casual"]
}

Allowed values only (use exact English slugs):
${catalogBlock()}

Rules:
- Pick the best single value for gender, ethnicity, age_band.
- build may be null if body is not visible enough.
- hair/vibe/wardrobe: 0-3 most confident matches.
- Never invent slugs outside the lists.
- Never name real people.
- summary_ko in Korean.`;
