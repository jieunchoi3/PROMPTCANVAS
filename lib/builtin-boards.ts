import { S } from "@/lib/strings";
import type { Board, BoardKind } from "@/lib/types";

/** Names stored in the database for the built-in boards. Never translate: existing rows are matched by these. */
export const BUILTIN_BOARD_NAMES: Record<BoardKind, string> = {
  canvas: "캔버스",
  characters: "인물",
  wardrobe: "의상",
  prompts: "프롬프트 저장소",
  video: "비디오",
};

const BUILTIN_BOARD_LABELS: Record<BoardKind, string> = {
  canvas: S.defaultBoard,
  characters: S.peopleBoard,
  wardrobe: S.wardrobeBoard,
  prompts: S.promptsBoard,
  video: S.videoBoard,
};

/** Display name: built-in boards follow the UI language, renamed or custom boards keep their own name. */
export function boardLabel(board: Pick<Board, "name" | "kind">): string {
  return board.name === BUILTIN_BOARD_NAMES[board.kind]
    ? BUILTIN_BOARD_LABELS[board.kind]
    : board.name;
}
