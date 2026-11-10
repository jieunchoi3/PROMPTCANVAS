import { isPeopleBoard } from "@/lib/board-kind";
import type { LibraryRepo, LibrarySnapshot } from "@/lib/data/repo";

/** Builds a snapshot from individual repo calls; used by the local repo and as a cloud fallback. */
export async function composeSnapshot(
  repo: LibraryRepo,
  preferredBoardId: string | null,
): Promise<LibrarySnapshot> {
  const boards = await repo.listBoards();
  const boardId =
    (preferredBoardId && boards.some((b) => b.id === preferredBoardId) ? preferredBoardId : null) ??
    (boards.find((b) => isPeopleBoard(b)) ?? boards[0])?.id ??
    null;
  const [assets, tags, assetTags, models, characters, characterAssets, promptSheets, customTopCategories] =
    await Promise.all([
      boardId ? repo.listAssets(boardId) : Promise.resolve([]),
      repo.listTags(),
      repo.listAssetTags(),
      repo.listModels(),
      repo.listCharacters(),
      repo.listCharacterAssets(),
      boardId ? repo.listPromptSheets(boardId) : Promise.resolve([]),
      repo.listCustomTopCategories(),
    ]);
  return {
    boards,
    boardId,
    assets,
    tags,
    assetTags,
    models,
    characters,
    characterAssets,
    promptSheets,
    customTopCategories,
  };
}
