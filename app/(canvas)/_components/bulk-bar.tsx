"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BoardMovePicker } from "@/components/board-move-picker";
import { TagPicker } from "@/components/tag-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { S } from "@/lib/strings";
import { isPeopleBoard, isWardrobeBoard, useCanvas } from "@/store/canvas-store";

export function BulkBar() {
  const selectedIds = useCanvas((s) => s.selectedIds);
  const assetTags = useCanvas((s) => s.assetTags);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const deleteSelection = useCanvas((s) => s.deleteSelection);
  const moveSelectionToBoard = useCanvas((s) => s.moveSelectionToBoard);
  const toggleTagOnSelection = useCanvas((s) => s.toggleTagOnSelection);
  const [tagOpen, setTagOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const currentBoard = boards.find((b) => b.id === boardId);
  const showCanvasTags = !isPeopleBoard(currentBoard) && !isWardrobeBoard(currentBoard);

  if (selectedIds.length === 0) return null;

  const shared = assetTags
    .filter((at) => selectedIds.includes(at.asset_id))
    .reduce<string[]>((acc, at) => {
      if (
        selectedIds.every((id) =>
          assetTags.some((x) => x.asset_id === id && x.tag_id === at.tag_id),
        ) &&
        !acc.includes(at.tag_id)
      ) {
        acc.push(at.tag_id);
      }
      return acc;
    }, []);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#151517]/95 px-3 py-1.5 text-[13px] shadow-lg backdrop-blur">
      <span className="pr-1 text-zinc-400">{S.bulkSelected(selectedIds.length)}</span>
      {showCanvasTags ? (
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger className="inline-flex h-6 items-center rounded-md px-2 text-[12px] hover:bg-white/10">
            {S.bulkTag}
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="center" side="top">
            <TagPicker
              activeIds={shared}
              onToggle={(id) => void toggleTagOnSelection(id)}
            />
          </PopoverContent>
        </Popover>
      ) : null}
      {selectedIds.length >= 2 ? (
        <Button size="xs" variant="ghost" onClick={() => toast(S.bulkGroupSoon)}>
          {S.bulkGroup}
        </Button>
      ) : null}
      <Popover open={moveOpen} onOpenChange={setMoveOpen}>
        <PopoverTrigger className="inline-flex h-6 items-center rounded-md bg-[#D9B382]/15 px-2 text-[12px] text-[#D9B382] hover:bg-[#D9B382]/25">
          {S.bulkMove}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="center" side="top">
          <BoardMovePicker
            onPick={(targetBoardId) => {
              setMoveOpen(false);
              void moveSelectionToBoard(targetBoardId);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button size="xs" variant="destructive" onClick={() => void deleteSelection()}>
        {S.bulkDelete}
      </Button>
    </div>
  );
}
