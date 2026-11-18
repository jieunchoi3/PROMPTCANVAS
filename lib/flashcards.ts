import { tagMatchesTopTab, type TopCategoryTab } from "@/lib/top-categories";
import type { Asset, AssetTag, FlashcardState, Tag } from "@/lib/types";

export type FlashcardMode = "all" | "image" | "term";
export type FlashcardAnswer = "again" | "hard" | "good";

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
const MINUTE_MS = 60_000;
/** Anki default learning "Again" step (1m). */
const AGAIN_DELAY_MS = 1 * MINUTE_MS;
/** Anki default second learning step / Hard on a new card (10m). */
const HARD_LEARNING_MS = 10 * MINUTE_MS;
/** Anki default graduating interval / first Good (1 day). */
const GRADUATING_DAYS = 1;
/** Anki default Hard multiplier on review cards. */
const HARD_FACTOR = 1.2;
/** Anki default ease factor for Good on review cards. */
const EASE = 2.5;
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

/**
 * Three-button SM-2 inspired by Anki defaults (Again / Hard / Good):
 * - Again → ~1 minute, interval reset
 * - Hard → 10 minutes while learning; review interval × 1.2
 * - Good → graduate at 1 day, then × ease 2.5 (1 → 3 → 8 → 20 …)
 */
export function grade(
  cardId: string,
  previous: FlashcardState | undefined,
  answer: FlashcardAnswer,
  now: number,
): FlashcardState {
  const learning = !previous || previous.interval_days < 1;

  if (answer === "again") {
    return {
      card_id: cardId,
      due_at: new Date(now + AGAIN_DELAY_MS).toISOString(),
      interval_days: 0,
      reps: previous?.reps ?? 0,
      lapses: (previous?.lapses ?? 0) + 1,
    };
  }

  if (answer === "hard") {
    if (learning) {
      return {
        card_id: cardId,
        due_at: new Date(now + HARD_LEARNING_MS).toISOString(),
        interval_days: 0,
        reps: previous?.reps ?? 0,
        lapses: previous?.lapses ?? 0,
      };
    }
    const interval = Math.max(GRADUATING_DAYS, Math.round(previous!.interval_days * HARD_FACTOR));
    return {
      card_id: cardId,
      due_at: new Date(now + interval * DAY_MS).toISOString(),
      interval_days: interval,
      reps: (previous?.reps ?? 0) + 1,
      lapses: previous?.lapses ?? 0,
    };
  }

  const interval = learning
    ? GRADUATING_DAYS
    : Math.max(GRADUATING_DAYS, Math.round(previous!.interval_days * EASE));
  return {
    card_id: cardId,
    due_at: new Date(now + interval * DAY_MS).toISOString(),
    interval_days: interval,
    reps: (previous?.reps ?? 0) + 1,
    lapses: previous?.lapses ?? 0,
  };
}

/** Milliseconds until the card would next be due after this answer. */
export function previewIntervalMs(
  previous: FlashcardState | undefined,
  answer: FlashcardAnswer,
  now: number,
): number {
  const next = grade("__preview__", previous, answer, now);
  return Math.max(0, new Date(next.due_at).getTime() - now);
}

/** Compact Anki-style label: 1분 / 10분 / 1일 / 4일 / 2개월 */
export function formatIntervalLabel(ms: number, locale: "ko" | "en"): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return locale === "ko" ? `${minutes}분` : `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return locale === "ko" ? `${hours}시간` : `${hours}h`;
  const days = Math.max(1, Math.round(ms / DAY_MS));
  if (days < 30) return locale === "ko" ? `${days}일` : `${days}d`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return locale === "ko" ? `${months}개월` : `${months}mo`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return locale === "ko" ? `${years}년` : `${years}y`;
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
