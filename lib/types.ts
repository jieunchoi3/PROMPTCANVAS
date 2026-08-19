export type AssetKind = "image" | "video";

export type TagKind =
  | "camera"
  | "lighting"
  | "style"
  | "colour"
  | "pose"
  | "subject"
  | "effect"
  | "free";

export type TagSource = "user" | "ai";

export type BoardKind = "canvas" | "characters" | "wardrobe" | "prompts";

export type Board = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  kind: BoardKind;
  created_at: string;
  updated_at: string;
};

export type AttributeMap = Record<string, string | string[]>;

export type Asset = {
  id: string;
  user_id: string;
  board_id: string;
  kind: AssetKind;
  storage_path: string;
  thumb_path: string | null;
  width: number;
  height: number;
  duration_ms: number | null;
  x: number;
  y: number;
  w: number;
  rotation: number;
  z_index: number;
  group_id: string | null;
  title: string | null;
  prompt: string;
  negative_prompt: string;
  model: string;
  source_note: string;
  is_character: boolean;
  attributes: AttributeMap;
  file_hash: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  thumbUrl: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  kind: TagKind;
  color: string;
  use_count: number;
};

export type AssetTag = {
  asset_id: string;
  tag_id: string;
  source: TagSource;
};

export type CharacterRole =
  | "front"
  | "side"
  | "back"
  | "closeup"
  | "expression"
  | "outfit"
  | "other";

export type Character = {
  id: string;
  user_id: string;
  name: string;
  notes: string;
  attributes: AttributeMap;
  cover_asset_id: string | null;
  base_prompt: string;
  created_at: string;
};

export type CharacterAsset = {
  character_id: string;
  asset_id: string;
  role: CharacterRole;
};

export type PromptSheetType = "character" | "location" | "style" | "scene" | "other";

export type PromptSheet = {
  id: string;
  user_id: string;
  board_id: string;
  title: string;
  body: string;
  negative_prompt: string;
  model: string;
  notes: string;
  sheet_type: PromptSheetType;
  created_at: string;
  updated_at: string;
};

export type WardrobeKeyword = {
  term: string;
  kind: "item" | "style" | "color" | "material" | "detail";
  why: string;
};

export type WardrobeAnalysis = {
  summary_ko: string;
  item_type: string;
  styling_vibe: string[];
  colors: string[];
  materials: string[];
  details: string[];
  suggested_tags: string[];
  keywords: WardrobeKeyword[];
};

export type Camera = {
  x: number;
  y: number;
  scale: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignmentGuide = {
  axis: "x" | "y";
  pos: number;
};

export type HistoryEntry =
  | {
      kind: "move";
      before: { id: string; x: number; y: number; w: number }[];
      after: { id: string; x: number; y: number; w: number }[];
    }
  | { kind: "delete"; ids: string[] }
  | { kind: "restore"; ids: string[] }
  | { kind: "tag-add"; assetIds: string[]; tagId: string }
  | { kind: "tag-remove"; assetIds: string[]; tagId: string }
  | {
      kind: "fields";
      id: string;
      before: Partial<
        Pick<Asset, "prompt" | "negative_prompt" | "model" | "title" | "attributes" | "is_character">
      >;
      after: Partial<
        Pick<Asset, "prompt" | "negative_prompt" | "model" | "title" | "attributes" | "is_character">
      >;
    };

export type UploadItem = {
  id: string;
  name: string;
  progress: number;
  error: string | null;
};

export type NewAssetInput = {
  id: string;
  file: File;
  thumb: Blob;
  kind: AssetKind;
  width: number;
  height: number;
  duration_ms: number | null;
  file_hash: string;
  x: number;
  y: number;
  w: number;
  z_index: number;
  title?: string;
};
