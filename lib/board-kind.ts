import { S } from "@/lib/strings";
import type { Board, BoardKind } from "@/lib/types";

export function resolveBoardKind(board: Board | undefined): BoardKind {
  if (!board) return "canvas";
  if (board.name === S.peopleBoard) return "characters";
  if (board.name === S.wardrobeBoard) return "wardrobe";
  if (board.name === S.promptsBoard) return "prompts";
  if (board.name === S.videoBoard) return "video";
  if (board.name === S.defaultBoard) return "canvas";
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

export function inferBoardKindPatch(board: Board): Partial<Board> | null {
  const resolved = resolveBoardKind(board);
  if (board.kind === resolved) return null;
  return { kind: resolved, updated_at: new Date().toISOString() };
}
