"use client";

import { isPromptsBoard } from "@/lib/board-kind";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/store/canvas-store";

export function BoardMovePicker({
  onPick,
  className,
}: {
  onPick: (boardId: string) => void;
  className?: string;
}) {
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const destinations = boards.filter(
    (board) => board.id !== boardId && !isPromptsBoard(board),
  );

  if (destinations.length === 0) {
    return <p className="text-[12px] text-zinc-500">{S.moveBoardEmpty}</p>;
  }

  return (
    <div className={cn("max-h-56 space-y-0.5 overflow-y-auto", className)}>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
        {S.moveToBoard}
      </div>
      {destinations.map((board) => (
        <button
          key={board.id}
          type="button"
          onClick={() => onPick(board.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-zinc-200 hover:bg-white/10"
        >
          <span>{board.emoji}</span>
          <span className="truncate">{board.name}</span>
        </button>
      ))}
    </div>
  );
}
