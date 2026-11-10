import { BUILTIN_BOARD_NAMES } from "@/lib/builtin-boards";
import { getRepo } from "@/lib/data/get-repo";
import { getLocale } from "@/lib/locale";
import type { Asset, Board, Character, PromptSheet, Tag } from "@/lib/types";

const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
const CACHE_KEY = "pc.translations.v1";
const BATCH_COUNT = 40;
const BATCH_CHARS = 8000;

export function hasHangul(text: string | null | undefined): text is string {
  return !!text && HANGUL.test(text);
}

/** Display text for the active language; Korean content falls back to the original until translated. */
export function translateText(translations: Record<string, string>, text: string): string {
  if (getLocale() !== "en" || !hasHangul(text)) return text;
  return translations[text.trim()] ?? text;
}

export function readTranslationCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function writeTranslationCache(translations: Record<string, string>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(translations));
  } catch {
    /* quota exceeded: skip caching */
  }
}

type TranslatableState = {
  boards: Board[];
  tags: Tag[];
  assets: Asset[];
  promptSheets: PromptSheet[];
  characters: Character[];
  customTopCategories: { id: string; label: string }[];
};

/** Every piece of owner-written Korean text currently loaded. */
export function collectKoreanTexts(state: TranslatableState): string[] {
  const out = new Set<string>();
  const add = (text: string | null | undefined) => {
    if (hasHangul(text)) out.add(text.trim());
  };
  for (const b of state.boards) {
    if (b.name !== BUILTIN_BOARD_NAMES[b.kind]) add(b.name);
  }
  for (const t of state.tags) add(t.name);
  for (const c of state.customTopCategories) add(c.label);
  for (const c of state.characters) add(c.name);
  for (const p of state.promptSheets) {
    add(p.title);
    add(p.body);
    add(p.negative_prompt);
    add(p.notes);
  }
  for (const a of state.assets) {
    add(a.prompt);
    add(a.negative_prompt);
    add(a.source_note);
  }
  return [...out];
}

function batches(texts: string[]): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length > 0 && (current.length >= BATCH_COUNT || chars + text.length > BATCH_CHARS)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) out.push(current);
  return out;
}

const failed = new Set<string>();
let running = false;

/** Translates loaded Korean text that has no English version yet. Owner only (the API checks too). */
export async function translateMissing(
  state: TranslatableState,
  known: Record<string, string>,
  onTranslated: (added: Record<string, string>) => void,
): Promise<void> {
  if (running) return;
  const missing = collectKoreanTexts(state).filter((t) => !(t in known) && !failed.has(t));
  if (missing.length === 0) return;
  running = true;
  try {
    for (const batch of batches(missing)) {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: batch }),
        });
        const json = (await res.json()) as { translations?: string[] };
        if (!res.ok || !json.translations) throw new Error("translate_failed");
        const rows = batch.map((source, i) => ({ source, translated: json.translations![i]! }));
        await getRepo().saveTranslations(rows);
        onTranslated(Object.fromEntries(rows.map((r) => [r.source, r.translated])));
      } catch {
        for (const t of batch) failed.add(t);
      }
    }
  } finally {
    running = false;
  }
}
