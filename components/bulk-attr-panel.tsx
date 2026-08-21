"use client";

import { useMemo } from "react";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { VIDEO_ATTRIBUTES } from "@/config/video-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
import { AttributeFilters } from "@/components/attribute-filters";
import { attrValues } from "@/lib/attributes";
import { S } from "@/lib/strings";
import type { Board } from "@/lib/types";
import { isPeopleBoard, isVideoBoard, isWardrobeBoard, useCanvas } from "@/store/canvas-store";

/** Right panel for labeling many selected people/wardrobe/video assets at once. */
export function BulkAttrPanel({ board }: { board: Board | undefined }) {
  const selectedIds = useCanvas((s) => s.selectedIds);
  const assets = useCanvas((s) => s.assets);
  const applyAttrToSelection = useCanvas((s) => s.applyAttrToSelection);
  const peopleBoard = isPeopleBoard(board);
  const wardrobeBoard = isWardrobeBoard(board);
  const videoBoard = isVideoBoard(board);
  const defs = peopleBoard
    ? CHARACTER_ATTRIBUTES
    : wardrobeBoard
      ? WARDROBE_ATTRIBUTES
      : videoBoard
        ? VIDEO_ATTRIBUTES
        : [];

  const sharedValues = useMemo(() => {
    const idSet = new Set(selectedIds);
    const selected = assets.filter((a) => idSet.has(a.id));
    const result: Record<string, string[]> = {};
    for (const def of defs) {
      result[def.key] = def.options
        .map((opt) => opt.value)
        .filter(
          (value) =>
            selected.length > 0 &&
            selected.every((a) => attrValues(a.attributes, def.key).includes(value)),
        );
    }
    return result;
  }, [assets, defs, selectedIds]);

  if (defs.length === 0 || selectedIds.length < 2) return null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#111113] px-3 py-3 text-[13px]">
      <div className="mb-1 text-sm text-zinc-200">{S.bulkSelected(selectedIds.length)}</div>
      <p className="mb-4 text-[12px] leading-relaxed text-zinc-500">{S.bulkAttrHint}</p>
      <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
        {peopleBoard ? S.peopleAttrs : wardrobeBoard ? S.wardrobeSection : S.videoAttrs}
      </div>
      <AttributeFilters
        defs={defs}
        values={sharedValues}
        onToggle={(key, value) => applyAttrToSelection(key, value)}
      />
    </aside>
  );
}
