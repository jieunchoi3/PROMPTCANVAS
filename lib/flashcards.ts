import { tagMatchesTopTab, type TopCategoryTab } from "@/lib/top-categories";
import type { Asset, AssetTag, FlashcardState, Tag } from "@/lib/types";

export type FlashcardMode = "all" | "image" | "term";
export type FlashcardAnswer = "again" | "good";

export type Flashcard =
  | {
      id: string;
      direction: "image";
      categoryId: string;
      categoryLabel: string;
      asset: Asset;
      answers: Tag[];
    }
  | {
      id: string;
      direction: "term";
      categoryId: string | null;
      categoryLabel: string;
      tag: Tag;
      examples: Asset[];
    };

const DAY_MS = 86_400_000;
const EXAMPLES_PER_TERM = 6;
const LOCAL_KEY = "pc.flashcards.v1";

/** Every image gets one card per keyword category it has; every keyword gets one reverse card. */
export function buildCards(
  assets: Asset[],
  assetTags: AssetTag[],
  tags: Tag[],
  tabs: TopCategoryTab[],
): Flashcard[] {
  const images = assets.filter((asset) => asset.kind === "image" && !asset.deleted_at);
  const assetById = new Map(images.map((asset) => [asset.id, asset]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const tabFor = (tag: Tag) => tabs.find((tab) => tagMatchesTopTab(tag, tab.id));

  const tagsByAsset = new Map<string, Tag[]>();
  const assetsByTag = new Map<string, Asset[]>();
  for (const link of assetTags) {
    const asset = assetById.get(link.asset_id);
    const tag = tagById.get(link.tag_id);
    if (!asset || !tag) continue;
    tagsByAsset.set(asset.id, [...(tagsByAsset.get(asset.id) ?? []), tag]);
    assetsByTag.set(tag.id, [...(assetsByTag.get(tag.id) ?? []), asset]);
  }

  const cards: Flashcard[] = [];
  for (const asset of images) {
    const own = tagsByAsset.get(asset.id) ?? [];
    for (const tab of tabs) {
      const answers = own.filter((tag) => tagMatchesTopTab(tag, tab.id));
      if (answers.length === 0) continue;
      cards.push({
        id: `f:${asset.id}:${tab.id}`,
        direction: "image",
        categoryId: tab.id,
        categoryLabel: tab.label,
        asset,
        answers,
      });
    }
  }
  for (const [tagId, examples] of assetsByTag) {
    const tag = tagById.get(tagId)!;
    const tab = tabFor(tag);
    cards.push({
      id: `r:${tagId}`,
      direction: "term",
      categoryId: tab?.id ?? null,
      categoryLabel: tab?.label ?? "",
      tag,
      examples: examples.slice(0, EXAMPLES_PER_TERM),
    });
  }
  return cards;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isDue(state: FlashcardState, now: number): boolean {
  return new Date(state.due_at).getTime() <= now;
}

export function filterCards(
  cards: Flashcard[],
  mode: FlashcardMode,
  categoryIds: string[],
): Flashcard[] {
  return cards.filter(
    (card) =>
      (mode === "all" || card.direction === mode) &&
      (categoryIds.length === 0 || (card.categoryId !== null && categoryIds.includes(card.categoryId))),
  );
}

export function countCards(
  cards: Flashcard[],
  states: Map<string, FlashcardState>,
  now: number,
  newLimit: number,
): { due: number; fresh: number } {
  let due = 0;
  let fresh = 0;
  for (const card of cards) {
    const state = states.get(card.id);
    if (!state) fresh += 1;
    else if (isDue(state, now)) due += 1;
  }
  return { due, fresh: Math.min(fresh, newLimit) };
}

/** Due cards plus a capped number of never-seen cards, shuffled together. */
export function buildSession(
  cards: Flashcard[],
  states: Map<string, FlashcardState>,
  now: number,
  newLimit: number,
): Flashcard[] {
  const due = cards.filter((card) => {
    const state = states.get(card.id);
    return state !== undefined && isDue(state, now);
  });
  const fresh = shuffle(cards.filter((card) => !states.has(card.id))).slice(0, newLimit);
  return shuffle([...due, ...fresh]);
}

/** Two-button spaced repetition: "again" resets the card, "good" grows the gap 1 → 3 → 8 → 20 days … */
export function grade(
  cardId: string,
  previous: FlashcardState | undefined,
  answer: FlashcardAnswer,
  now: number,
): FlashcardState {
  if (answer === "again") {
    return {
      card_id: cardId,
      due_at: new Date(now).toISOString(),
      interval_days: 0,
      reps: previous?.reps ?? 0,
      lapses: (previous?.lapses ?? 0) + 1,
    };
  }
  const interval =
    !previous || previous.interval_days < 1
      ? 1
      : Math.max(1, Math.round(previous.interval_days * 2.5));
  return {
    card_id: cardId,
    due_at: new Date(now + interval * DAY_MS).toISOString(),
    interval_days: interval,
    reps: (previous?.reps ?? 0) + 1,
    lapses: previous?.lapses ?? 0,
  };
}

function readLocalMap(): Record<string, FlashcardState> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, FlashcardState>) : {};
  } catch {
    return {};
  }
}

export function readLocalFlashcardStates(): FlashcardState[] {
  return Object.values(readLocalMap());
}

export function writeLocalFlashcardState(state: FlashcardState): void {
  const map = readLocalMap();
  map[state.card_id] = state;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* storage full or blocked: progress just isn't kept */
  }
}
