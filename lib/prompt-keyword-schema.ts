import { z } from "zod";
import type { ReverseAnalysis } from "@/lib/reverse-analysis-schema";
import { reverseKeywordSchema } from "@/lib/reverse-analysis-schema";
import type { TopCategoryTab } from "@/lib/top-categories";
import type { TagKind } from "@/lib/types";

export const promptKeywordResultSchema = z.object({
  keywords: z.array(reverseKeywordSchema).min(1).max(24),
  suggested_tags: z.array(z.string().min(1)).max(16).default([]),
});

export type PromptKeywordResult = z.infer<typeof promptKeywordResultSchema>;

export const PROMPT_KEYWORD_PROMPT = `You extract image-generation technique keywords from a pasted prompt. Return strict JSON only (no markdown).

Schema:
{
  "keywords": [
    { "term": "short English technique phrase", "section": "lighting|camera_lens|colour|style_texture|pose_composition|background|mood|subject", "kind": "lighting|camera|colour|pose|style|subject|effect|free", "why": "짧은 한국어 설명" }
  ],
  "suggested_tags": ["optional short free tags"]
}

Rules:
- Pull 6–16 technique keywords from the prompt. Prefer lighting, camera/framing, colour, mood, pose, background and style terms.
- kind "pose" is ONLY for the person's body action. kind "camera" covers angle, shot size, framing and lens.
- section "background" for environment/backdrop terms. section "camera_lens" for angle/framing/lens terms.
- Keep each term short (2–6 words). Copy wording from the prompt when possible.
- Do not invent subjects that are not in the prompt.`;

type Picked = {
  name: string;
  kind: TagKind;
  categoryKey: string | null;
  tabLabel: string;
};

function customTab(
  tabs: TopCategoryTab[],
  ...needles: string[]
): TopCategoryTab | undefined {
  const lower = needles.map((n) => n.toLowerCase());
  return tabs.find(
    (tab) =>
      !tab.builtin && lower.some((n) => tab.label.toLowerCase().includes(n)),
  );
}

function tabForKeyword(
  tabs: TopCategoryTab[],
  kind: TagKind,
  section: string,
): TopCategoryTab | undefined {
  if (section === "background") {
    const bg = customTab(tabs, "배경", "background");
    if (bg) return bg;
  }
  if (section === "camera_lens") {
    const lens = customTab(tabs, "렌즈", "lens");
    // Only send clear lens terms to the lens tab; angles stay under camera.
    if (lens && kind === "camera") {
      // Prefer the builtin camera tab when it exists; lens is a custom split the owner made.
    }
  }
  const builtin = tabs.find((tab) => tab.builtin && tab.id === kind);
  if (builtin) return builtin;
  if (kind === "free" || kind === "effect" || kind === "subject") {
    return customTab(tabs, "용어", "term", "glossary") ?? tabs.find((t) => t.id === "free");
  }
  return undefined;
}

/** Turn an AI analysis into the dialog's "picked keywords" list, matching the owner's category tabs. */
export function analysisToPickedKeywords(
  analysis: Pick<ReverseAnalysis, "keywords" | "suggested_tags">,
  tabs: TopCategoryTab[],
): Picked[] {
  const out: Picked[] = [];
  const seen = new Set<string>();
  const push = (name: string, kind: TagKind, categoryKey: string | null, tabLabel: string) => {
    const key = `${kind}|${categoryKey ?? ""}|${name.toLowerCase()}`;
    if (!name.trim() || seen.has(key)) return;
    seen.add(key);
    out.push({ name: name.trim(), kind, categoryKey, tabLabel });
  };

  for (const kw of analysis.keywords) {
    const tab = tabForKeyword(tabs, kw.kind, kw.section);
    if (!tab) {
      push(kw.term, kw.kind, null, kw.kind);
      continue;
    }
    if (tab.builtin) push(kw.term, tab.id, null, tab.label);
    else push(kw.term, "free", tab.id, tab.label);
  }

  const termTab = customTab(tabs, "용어", "term", "glossary");
  for (const name of analysis.suggested_tags) {
    if (termTab) push(name, "free", termTab.id, termTab.label);
    else push(name, "free", null, "기타");
  }
  return out;
}
