import { BUILTIN_BOARD_NAMES } from "@/lib/builtin-boards";
import type { Board, BoardKind } from "@/lib/types";

export function resolveBoardKind(board: Board | undefined): BoardKind {
  if (!board) return "canvas";
  if (board.name === BUILTIN_BOARD_NAMES.characters) return "characters";
  if (board.name === BUILTIN_BOARD_NAMES.wardrobe) return "wardrobe";
  if (board.name === BUILTIN_BOARD_NAMES.prompts) return "prompts";
  if (board.name === BUILTIN_BOARD_NAMES.video) return "video";
  if (board.name === BUILTIN_BOARD_NAMES.canvas) return "canvas";
  if (
    board.kind === "characters" ||
    board.kind === "wardrobe" ||
    board.kind === "prompts" ||
    board.kind === "video"
  ) {
    return board.kind;
  }
  return board.kind ?? "canvas";
}

export function isPeopleBoard(board: Board | undefined): boolean {
  return resolveBoardKind(board) === "characters";
}

export function isWardrobeBoard(board: Board | undefined): boolean {
  return resolveBoardKind(board) === "wardrobe";
}

export function isPromptsBoard(board: Board | undefined): boolean {
  return resolveBoardKind(board) === "prompts";
}

export function isVideoBoard(board: Board | undefined): boolean {
  return resolveBoardKind(board) === "video";
}

export function sortBoards(boards: Board[]): Board[] {
  return [...boards].sort((a, b) => {
    const pa = a.position ?? Number.MAX_SAFE_INTEGER;
    const pb = b.position ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function inferBoardKindPatch(board: Board): Partial<Board> | null {
  const resolved = resolveBoardKind(board);
  if (board.kind === resolved) return null;
  return { kind: resolved, updated_at: new Date().toISOString() };
}
