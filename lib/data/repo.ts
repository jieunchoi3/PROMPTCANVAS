import type {
  Asset,
  AssetTag,
  Board,
  BoardKind,
  Character,
  CharacterAsset,
  NewAssetInput,
  Tag,
  TagKind,
} from "@/lib/types";

export type LibraryRepo = {
  mode: "local" | "cloud";
  getUserId(): Promise<string>;
  listBoards(): Promise<Board[]>;
  createBoard(name: string, emoji: string, kind?: BoardKind): Promise<Board>;
  listAssets(boardId: string | "all"): Promise<Asset[]>;
  listTags(): Promise<Tag[]>;
  listAssetTags(): Promise<AssetTag[]>;
  findByHash(hash: string): Promise<Asset | null>;
  insertAsset(input: NewAssetInput, boardId: string): Promise<Asset>;
  updateAssets(
    patches: { id: string; fields: Partial<Asset> }[],
  ): Promise<void>;
  softDelete(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<void>;
  upsertTag(name: string, kind?: TagKind): Promise<Tag>;
  updateTag(id: string, fields: { name?: string; kind?: TagKind }): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  addAssetTag(assetId: string, tagId: string): Promise<void>;
  removeAssetTag(assetId: string, tagId: string): Promise<void>;
  listModels(): Promise<string[]>;
  listCharacters(): Promise<Character[]>;
  listCharacterAssets(): Promise<CharacterAsset[]>;
  upsertCharacter(
    input: Omit<Character, "user_id" | "created_at"> & { created_at?: string },
  ): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  setCharacterAssets(
    characterId: string,
    links: { asset_id: string; role: CharacterAsset["role"] }[],
  ): Promise<void>;
};
