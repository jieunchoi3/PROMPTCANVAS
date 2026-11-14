"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTr } from "@/hooks/use-tr";
import { getRepo } from "@/lib/data/get-repo";
import {
  buildCards,
  buildSession,
  countCards,
  filterCards,
  grade,
  readLocalFlashcardStates,
  writeLocalFlashcardState,
  type Flashcard,
  type FlashcardAnswer,
  type FlashcardMode,
} from "@/lib/flashcards";
import { S } from "@/lib/strings";
import { mergeTopTabs } from "@/lib/top-categories";
import type { FlashcardState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/store/canvas-store";

const NEW_PER_SESSION = 20;
const AGAIN_GAP = 3;

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function FlashcardStudy() {
  const open = useCanvas((s) => s.flashcardsOpen);
  const setOpen = useCanvas((s) => s.setFlashcardsOpen);
  const assets = useCanvas((s) => s.assets);
  const assetTags = useCanvas((s) => s.assetTags);
  const tags = useCanvas((s) => s.tags);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const canEdit = useCanvas((s) => s.canEdit);
  const tr = useTr();

  const [states, setStates] = useState<Map<string, FlashcardState> | null>(null);
  const [mode, setMode] = useState<FlashcardMode>("all");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const cards = useMemo(
    () => buildCards(assets, assetTags, tags, tabs),
    [assets, assetTags, tags, tabs],
  );
  const modeCards = useMemo(() => filterCards(cards, mode, []), [cards, mode]);
  const filtered = useMemo(
    () => filterCards(cards, mode, categoryIds),
    [cards, mode, categoryIds],
  );
  const usableTabs = tabs.filter((tab) => modeCards.some((card) => card.categoryId === tab.id));

  // Answering updates `states`; only opening or changing the filters starts a new session.
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const statesRef = useRef(states);
  statesRef.current = states;

  useEffect(() => {
    if (!open) {
      setStates(null);
      return;
    }
    let cancelled = false;
    const load = canEdit
      ? getRepo().listFlashcardStates()
      : Promise.resolve(readLocalFlashcardStates());
    load
      .catch(() => [] as FlashcardState[])
      .then((rows) => {
        if (!cancelled) setStates(new Map(rows.map((row) => [row.card_id, row])));
      });
    return () => {
      cancelled = true;
    };
  }, [open, canEdit]);

  const categoryKey = categoryIds.join("|");
  useEffect(() => {
    if (!open || !statesRef.current) return;
    setQueue(buildSession(filteredRef.current, statesRef.current, Date.now(), NEW_PER_SESSION));
    setFlipped(false);
    setReviewed(0);
  }, [open, states === null, mode, categoryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue[0];

  const answer = useCallback(
    (result: FlashcardAnswer) => {
      if (!current || !states) return;
      const next = grade(current.id, states.get(current.id), result, Date.now());
      setStates(new Map(states).set(current.id, next));
      if (canEdit) {
        getRepo()
          .saveFlashcardState(next)
          .catch(() => toast.error(S.flashcardSaveFailed));
      } else {
        writeLocalFlashcardState(next);
      }
      const rest = queue.slice(1);
      if (result === "again") rest.splice(Math.min(AGAIN_GAP, rest.length), 0, current);
      setQueue(rest);
      setFlipped(false);
      setReviewed((n) => n + 1);
    },
    [current, states, queue, canEdit],
  );

  useEffect(() => {
    if (!open || !current) return;
    // Capture phase + preventDefault so Space/Enter never also "click" a focused chip.
    function onKey(e: KeyboardEvent) {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && e.key === "1") {
        e.preventDefault();
        answer("again");
      } else if (flipped && (e.key === "2" || e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        answer("good");
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, current, flipped, answer]);

  const counts = states
    ? countCards(filtered, states, Date.now(), NEW_PER_SESSION)
    : { due: 0, fresh: 0 };

  function chip(active: boolean) {
    return cn(
      "h-6 rounded-full px-2.5 text-[12px]",
      active ? "bg-white text-[#0B0B0D]" : "bg-white/5 text-zinc-400 hover:bg-white/10",
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[94vh] overflow-y-auto bg-[#141416] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{S.flashcards}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["all", S.flashcardModeAll],
                ["image", S.flashcardModeImage],
                ["term", S.flashcardModeTerm],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={chip(mode === value)}
                onClick={() => {
                  setMode(value);
                  setCategoryIds([]);
                }}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-[12px] text-zinc-500">
              {S.flashcardCounts(counts.due, counts.fresh)}
              {queue.length > 0 ? ` · ${S.flashcardRemaining(queue.length)}` : ""}
            </span>
          </div>
          {usableTabs.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {usableTabs.map((tab) => {
                const on = categoryIds.includes(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={chip(on)}
                    onClick={() =>
                      setCategoryIds((ids) =>
                        on ? ids.filter((id) => id !== tab.id) : [...ids, tab.id],
                      )
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {!states ? (
          <p className="py-16 text-center text-sm text-zinc-500">{S.loading}</p>
        ) : cards.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">{S.flashcardEmpty}</p>
        ) : !current ? (
          <div className="space-y-3 py-12 text-center">
            <p className="text-base text-zinc-100">{S.flashcardDone}</p>
            <p className="text-[13px] text-zinc-500">{S.flashcardDoneHint(reviewed)}</p>
            {filtered.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQueue(shuffled(filtered));
                  setFlipped(false);
                  setReviewed(0);
                }}
              >
                {S.flashcardStudyAll}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex min-h-[46vh] flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-black/30 p-4">
              {current.direction === "image" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.asset.url}
                    alt=""
                    className="max-h-[46vh] w-auto max-w-full rounded-md object-contain"
                  />
                  <div className="text-center">
                    <div className="text-[15px] text-zinc-300">
                      {S.flashcardAsk(current.categoryLabel)}
                    </div>
                    {flipped ? (
                      <div className="mt-2 text-xl leading-snug text-[#D9B382]">
                        {current.answers.map((tag) => tr(tag.name)).join(", ")}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    {current.categoryLabel ? (
                      <div className="mb-1 text-[12px] text-zinc-500">{current.categoryLabel}</div>
                    ) : null}
                    <div className="text-2xl leading-snug text-zinc-100">
                      {tr(current.tag.name)}
                    </div>
                    {!flipped ? (
                      <div className="mt-3 text-[13px] text-zinc-500">{S.flashcardImagine}</div>
                    ) : null}
                  </div>
                  {flipped ? (
                    <div
                      className={cn(
                        "grid w-full gap-2",
                        current.examples.length === 1
                          ? "grid-cols-1"
                          : current.examples.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-3",
                      )}
                    >
                      {current.examples.map((asset) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={asset.id}
                          src={asset.thumbUrl || asset.url}
                          alt=""
                          className="max-h-[36vh] w-full rounded-md object-contain"
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {!flipped ? (
              <Button className="h-10 w-full" variant="outline" onClick={() => setFlipped(true)}>
                {S.flashcardShowAnswer}
                <kbd className="ml-2 text-[11px] text-zinc-500">Space</kbd>
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button className="h-10" variant="outline" onClick={() => answer("again")}>
                  {S.flashcardDontKnow}
                  <kbd className="ml-2 text-[11px] text-zinc-500">1</kbd>
                </Button>
                <Button
                  className="h-10 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
                  onClick={() => answer("good")}
                >
                  {S.flashcardKnow}
                  <kbd className="ml-2 text-[11px] text-[#0B0B0D]/60">2</kbd>
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
