"use client";

import { CanvasBoard } from "./_components/canvas-board";
import { PromptsBoard } from "./_components/prompts-board";
import { isPromptsBoard, useCanvas } from "@/store/canvas-store";

export default function CanvasPage() {
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const current = boards.find((b) => b.id === boardId);

  if (isPromptsBoard(current)) {
    return <PromptsBoard />;
  }

  return <CanvasBoard />;
}
