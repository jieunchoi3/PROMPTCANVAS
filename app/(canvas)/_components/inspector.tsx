"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
import { AttributeFilters, attrMapToFilterValues } from "@/components/attribute-filters";
import { BoardMovePicker } from "@/components/board-move-picker";
import { ReverseAnalysisPanel } from "@/components/reverse-analysis-panel";
import { TagPicker } from "@/components/tag-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { optionLabel } from "@/lib/attributes";
import { formatDate } from "@/lib/env";
import { S } from "@/lib/strings";
import { isPeopleBoard, isWardrobeBoard, useCanvas } from "@/store/canvas-store";

export function Inspector() {
  const selectedIds = useCanvas((s) => s.selectedIds);
  const assets = useCanvas((s) => s.assets);
  const assetTags = useCanvas((s) => s.assetTags);
  const boards = useCanvas((s) => s.boards);
  const models = useCanvas((s) => s.models);
  const updateFields = useCanvas((s) => s.updateFields);
  const toggleTagOnSelection = useCanvas((s) => s.toggleTagOnSelection);
  const moveSelectionToBoard = useCanvas((s) => s.moveSelectionToBoard);
  const setLightboxId = useCanvas((s) => s.setLightboxId);
  const [boardMoveOpen, setBoardMoveOpen] = useState(false);
  const toggleAssetAttr = useCanvas((s) => s.toggleAssetAttr);
  const setCharacterDialogOpen = useCanvas((s) => s.setCharacterDialogOpen);
  const analyses = useCanvas((s) => s.analyses);
  const analyzingAssetId = useCanvas((s) => s.analyzingAssetId);
  const analyzeAsset = useCanvas((s) => s.analyzeAsset);
  const analyzeWardrobeAsset = useCanvas((s) => s.analyzeWardrobeAsset);
  const [copied, setCopied] = useState(false);

  const asset = selectedIds.length === 1 ? assets.find((a) => a.id === selectedIds[0]) : undefined;

  const linkedIds = useMemo(() => {
    if (!asset) return [];
    return assetTags.filter((at) => at.asset_id === asset.id).map((at) => at.tag_id);
  }, [asset, assetTags]);

  if (!asset) return null;

  const board = boards.find((b) => b.id === asset.board_id);
  const peopleBoard = isPeopleBoard(board);
  const wardrobeBoard = isWardrobeBoard(board);
  const attrDefs = peopleBoard ? CHARACTER_ATTRIBUTES : wardrobeBoard ? WARDROBE_ATTRIBUTES : [];

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#111113] px-3 py-3 text-[13px]">
      <button
        type="button"
        className="mb-3 overflow-hidden rounded-sm bg-black"
        onClick={() => setLightboxId(asset.id)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.url}
          alt={asset.title ?? ""}
          className="max-h-44 w-full object-contain"
        />
      </button>

      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-500">
        <span>{S.inspectorPrompt}</span>
        <span className="normal-case tracking-normal">{S.charCount(asset.prompt.length)}</span>
      </div>
      <Textarea
        value={asset.prompt}
        onChange={(e) => updateFields(asset.id, { prompt: e.target.value })}
        className="min-h-28 resize-y border-white/10 bg-black/40 text-[13px] leading-relaxed"
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-2 h-7 w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(asset.prompt);
          setCopied(true);
          toast.success(S.copied);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {S.copy}
      </Button>

      <div className="mt-4 mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
        {S.inspectorModel}
      </div>
      <input
        value={asset.model}
        placeholder={S.modelPlaceholder}
        onChange={(e) => updateFields(asset.id, { model: e.target.value })}
        className="h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 text-[13px] outline-none focus:border-[#D9B382]/60"
      />
      {models.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {models.slice(0, 6).map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => updateFields(asset.id, { model })}
              className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/10"
            >
              {model}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
        {S.inspectorTags}
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-zinc-500">
        {S.inspectorTagsHint}
      </p>
      <TagPicker
        activeIds={linkedIds}
        onToggle={(id) => void toggleTagOnSelection(id)}
      />

      <div className="mt-4 mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
        {S.inspectorReverse}
      </div>
      {asset.kind === "image" && !peopleBoard && !wardrobeBoard ? (
        <ReverseAnalysisPanel
          assetId={asset.id}
          analysis={analyses[asset.id] ?? null}
          busy={analyzingAssetId === asset.id}
          onRun={() => {
            void analyzeAsset(asset.id)
              .then(() => toast.success(S.analysisDone))
              .catch(() => toast.error(S.analysisFailed));
          }}
        />
      ) : (
        <p className="text-[11px] text-zinc-500">{S.inspectorReverseSoon}</p>
      )}

      {attrDefs.length > 0 ? (
        <>
          <div className="mt-4 mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
            {peopleBoard ? S.peopleAttrs : S.wardrobeSection}
          </div>
          <AttributeFilters
            defs={attrDefs}
            values={attrMapToFilterValues(asset.attributes, attrDefs)}
            onToggle={(key, value) => toggleAssetAttr(asset.id, key, value)}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(asset.attributes).flatMap(([key, raw]) =>
              (Array.isArray(raw) ? raw : [raw]).map((value) => (
                <span
                  key={`${key}-${value}`}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400"
                >
                  {optionLabel(key, value)}
                </span>
              )),
            )}
          </div>
        </>
      ) : null}

      {peopleBoard ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-7"
          onClick={() => setCharacterDialogOpen(true)}
        >
          {S.saveCharacter}
        </Button>
      ) : null}

      {wardrobeBoard ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-7"
          disabled={analyzingAssetId === asset.id || asset.kind !== "image"}
          onClick={() => {
            void analyzeWardrobeAsset(asset.id)
              .then(() => toast.success(S.wardrobeAnalyzed))
              .catch(() => toast.error(S.wardrobeAnalyzeFailed));
          }}
        >
          {analyzingAssetId === asset.id ? S.analyzing : S.analyzeWardrobe}
        </Button>
      ) : null}

      <div className="mt-4 space-y-1.5 text-[12px] text-zinc-400">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
          {S.inspectorMeta}
        </div>
        <div>
          {S.dimensions}: {asset.width}×{asset.height}
        </div>
        <div>
          {S.added}: {formatDate(asset.created_at)}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>
            {S.board}: {board ? `${board.emoji} ${board.name}` : S.none}
          </span>
          <Popover open={boardMoveOpen} onOpenChange={setBoardMoveOpen}>
            <PopoverTrigger className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300">
              {S.bulkMove}
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end" side="top">
              <BoardMovePicker
                onPick={(boardId) => {
                  setBoardMoveOpen(false);
                  void moveSelectionToBoard(boardId);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          {S.group}: {S.none}
        </div>
      </div>
    </aside>
  );
}
