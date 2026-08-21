"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { PERSIST_MS, UNDO_TOAST_MS } from "@/lib/constants";
import { getRepo } from "@/lib/data/get-repo";
import { clearSeedAssets, ensureStarterTags } from "@/lib/seed-local";
import { fetchImageBase64 } from "@/lib/image-base64";
import type { ReverseAnalysis } from "@/lib/reverse-analysis-schema";
import type { WardrobeAnalysisInput } from "@/lib/wardrobe-analysis-schema";
import { matchesAttributes, hasAttrFilters, toggleAttribute, applyAttribute, attrValues } from "@/lib/attributes";
import { isPeopleBoard, isWardrobeBoard } from "@/lib/board-kind";
import { S } from "@/lib/strings";
import {
  customCategoryId,
  type CustomTopCategory,
} from "@/lib/top-categories";
import {
  coarseTagTabFilter,
  filterAssetsByTags,
} from "@/lib/tag-filter";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
import type {
  AlignmentGuide,
  Asset,
  AssetTag,
  AttributeMap,
  Board,
  BoardKind,
  Camera,
  Character,
  CharacterAsset,
  HistoryEntry,
  PromptSheet,
  PromptSheetType,
  Rect,
  Tag,
  UploadItem,
} from "@/lib/types";

type FieldPatch = {
  prompt?: string;
  negative_prompt?: string;
  model?: string;
  title?: string;
  attributes?: AttributeMap;
  is_character?: boolean;
};

type CanvasState = {
  ready: boolean;
  loadError: string | null;
  mode: "local" | "cloud";
  boards: Board[];
  boardId: string | null;
  assets: Asset[];
  tags: Tag[];
  assetTags: AssetTag[];
  selectedIds: string[];
  camera: Camera;
  spaceDown: boolean;
  videoAutoplay: boolean;
  filterKinds: Tag["kind"][];
  filterCustomTabs: string[];
  customTopCategories: CustomTopCategory[];
  filterTagIds: string[];
  models: string[];
  uploads: UploadItem[];
  guides: AlignmentGuide[];
  marquee: Rect | null;
  undoToast: { ids: string[]; label: string } | null;
  commandOpen: boolean;
  lightboxId: string | null;
  characters: Character[];
  characterAssets: CharacterAsset[];
  attrFilters: Record<string, string[]>;
  characterDialogOpen: boolean;
  promptSheets: PromptSheet[];
  selectedPromptId: string | null;
  filterSheetTypes: PromptSheetType[];
  analyses: Record<string, ReverseAnalysis>;
  analyzingAssetId: string | null;
  history: HistoryEntry[];
  future: HistoryEntry[];
  load: () => Promise<void>;
  setBoard: (id: string) => Promise<void>;
  createBoard: (name: string, emoji: string, kind?: BoardKind) => Promise<void>;
  setCamera: (camera: Camera) => void;
  setSpaceDown: (v: boolean) => void;
  setMarquee: (r: Rect | null) => void;
  setGuides: (g: AlignmentGuide[]) => void;
  toggleVideoAutoplay: () => void;
  toggleFilterKind: (kind: Tag["kind"]) => void;
  toggleFilterCustomTab: (tabId: string) => void;
  addCustomTopCategory: (label: string) => Promise<void>;
  toggleFilterTag: (id: string) => void;
  clearFilters: () => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  moveAssets: (
    ids: string[],
    dx: number,
    dy: number,
    snapFn?: (asset: Asset) => { x: number; y: number },
  ) => void;
  resizeAsset: (id: string, w: number) => void;
  commitHistory: (entry: HistoryEntry) => void;
  persistNow: () => void;
  updateFields: (id: string, fields: FieldPatch, recordHistory?: boolean) => void;
  addTagToSelection: (name: string, kind?: Tag["kind"], categoryKey?: string | null) => Promise<void>;
  toggleTagOnSelection: (tagId: string) => Promise<void>;
  createTag: (
    name: string,
    kind: Tag["kind"],
    categoryKey?: string | null,
  ) => Promise<Tag | null>;
  renameTag: (id: string, name: string) => Promise<boolean>;
  setTagKind: (id: string, kind: Tag["kind"]) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  removeTag: (assetId: string, tagId: string) => Promise<void>;
  deleteSelection: () => Promise<void>;
  moveSelectionToBoard: (targetBoardId: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  addAssets: (assets: Asset[]) => void;
  setUploads: (items: UploadItem[]) => void;
  setCommandOpen: (v: boolean) => void;
  setLightboxId: (id: string | null) => void;
  dismissUndoToast: () => void;
  toggleAttrFilter: (key: string, value: string) => void;
  clearAttrFilters: () => void;
  toggleAssetAttr: (assetId: string, key: string, value: string) => void;
  applyAttrToSelection: (key: string, value: string) => void;
  setCharacterDialogOpen: (open: boolean) => void;
  saveCharacter: (input: {
    name: string;
    attributes: AttributeMap;
    base_prompt: string;
    id?: string;
  }) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  selectCharacter: (id: string) => void;
  selectPrompt: (id: string | null) => void;
  toggleFilterSheetType: (type: PromptSheetType) => void;
  createPromptSheet: (type?: PromptSheetType) => Promise<void>;
  updatePromptSheet: (
    id: string,
    fields: Partial<
      Pick<
        PromptSheet,
        "title" | "body" | "negative_prompt" | "model" | "notes" | "sheet_type"
      >
    >,
  ) => Promise<void>;
  deletePromptSheet: (id: string) => Promise<void>;
  uploadPromptPreview: (id: string, file: File | null) => Promise<void>;
  analyzeAsset: (assetId: string) => Promise<void>;
  analyzeWardrobeAsset: (assetId: string) => Promise<void>;
  applyAnalysis: (
    assetId: string,
    opts: { prompt: boolean; tags: boolean },
  ) => Promise<void>;
};

const dirty = new Map<string, Partial<Asset>>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const deletedCache = new Map<string, Asset>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(run: () => void) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(run, PERSIST_MS);
}

function cameraKey(boardId: string): string {
  return `pc.camera.${boardId}`;
}

function readCamera(boardId: string): Camera {
  try {
    const raw = localStorage.getItem(cameraKey(boardId));
    if (raw) return JSON.parse(raw) as Camera;
  } catch {
    /* ignore */
  }
  return { x: 80, y: 80, scale: 1 };
}

export const useCanvas = create<CanvasState>((set, get) => ({
  ready: false,
  loadError: null,
  mode: "local",
  boards: [],
  boardId: null,
  assets: [],
  tags: [],
  assetTags: [],
  selectedIds: [],
  camera: { x: 80, y: 80, scale: 1 },
  spaceDown: false,
  videoAutoplay: true,
  filterKinds: [],
  filterCustomTabs: [],
  customTopCategories: [],
  filterTagIds: [],
  models: [],
  uploads: [],
  guides: [],
  marquee: null,
  undoToast: null,
  commandOpen: false,
  lightboxId: null,
  characters: [],
  characterAssets: [],
  attrFilters: {},
  characterDialogOpen: false,
  promptSheets: [],
  selectedPromptId: null,
  filterSheetTypes: [],
  analyses: {},
  analyzingAssetId: null,
  history: [],
  future: [],

  load: async () => {
    set({ loadError: null });
    try {
      const repo = getRepo();
      const boards = await repo.listBoards();
      const boardId = boards[0]?.id ?? null;
      if (!boardId) {
        set({ ready: true, mode: repo.mode, boards, loadError: null });
        return;
      }
      await clearSeedAssets(repo);
      await ensureStarterTags(repo);
      const [assets, tags, assetTags, models, characters, characterAssets, promptSheets, customTopCategories] =
        await Promise.all([
          repo.listAssets(boardId),
          repo.listTags(),
          repo.listAssetTags(),
          repo.listModels(),
          repo.listCharacters(),
          repo.listCharacterAssets(),
          repo.listPromptSheets(boardId),
          repo.listCustomTopCategories(),
        ]);
      set({
        ready: true,
        mode: repo.mode,
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
        selectedPromptId: null,
        camera: readCamera(boardId),
        loadError: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "load failed";
      set({ ready: false, loadError: message });
      console.error("[canvas] load failed", err);
    }
  },

  setBoard: async (id) => {
    const repo = getRepo();
    const [assets, tags, assetTags, promptSheets] = await Promise.all([
      repo.listAssets(id),
      repo.listTags(),
      repo.listAssetTags(),
      repo.listPromptSheets(id),
    ]);
    get().persistNow();
    set({
      boardId: id,
      assets,
      tags,
      assetTags,
      promptSheets,
      selectedIds: [],
      selectedPromptId: null,
      camera: readCamera(id),
      filterKinds: [],
      filterCustomTabs: [],
      filterTagIds: [],
      filterSheetTypes: [],
      attrFilters: {},
    });
  },

  createBoard: async (name, emoji, kind = "canvas") => {
    const board = await getRepo().createBoard(name, emoji, kind);
    set({ boards: [...get().boards, board] });
    await get().setBoard(board.id);
  },

  setCamera: (camera) => {
    set({ camera });
    const boardId = get().boardId;
    if (boardId) localStorage.setItem(cameraKey(boardId), JSON.stringify(camera));
  },
  setSpaceDown: (spaceDown) => set({ spaceDown }),
  setMarquee: (marquee) => set({ marquee }),
  setGuides: (guides) => set({ guides }),
  toggleVideoAutoplay: () => set({ videoAutoplay: !get().videoAutoplay }),
  toggleFilterKind: (kind) => {
    const cur = get().filterKinds;
    set({
      filterKinds: cur.includes(kind)
        ? cur.filter((x) => x !== kind)
        : [...cur, kind],
    });
  },
  toggleFilterCustomTab: (tabId) => {
    const cur = get().filterCustomTabs;
    set({
      filterCustomTabs: cur.includes(tabId)
        ? cur.filter((x) => x !== tabId)
        : [...cur, tabId],
    });
  },
  addCustomTopCategory: async (label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = customCategoryId(trimmed);
    const cur = get().customTopCategories;
    if (cur.some((c) => c.id === id)) return;
    const next = [...cur, { id, label: trimmed }];
    await getRepo().saveCustomTopCategories(next);
    set({ customTopCategories: next });
  },
  toggleFilterTag: (id) => {
    const cur = get().filterTagIds;
    set({
      filterTagIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  },
  clearFilters: () =>
    set({
      filterKinds: [],
      filterCustomTabs: [],
      filterTagIds: [],
      filterSheetTypes: [],
    }),
  select: (ids, additive = false) => {
    if (!additive) {
      set({ selectedIds: ids });
      return;
    }
    const setIds = new Set(get().selectedIds);
    for (const id of ids) {
      if (setIds.has(id)) setIds.delete(id);
      else setIds.add(id);
    }
    set({ selectedIds: [...setIds] });
  },
  clearSelection: () => set({ selectedIds: [] }),

  moveAssets: (ids, dx, dy, snapFn) => {
    const idSet = new Set(ids);
    set({
      assets: get().assets.map((a) => {
        if (!idSet.has(a.id)) return a;
        const next = { ...a, x: a.x + dx, y: a.y + dy };
        const snapped = snapFn ? snapFn(next) : next;
        dirty.set(a.id, { x: snapped.x, y: snapped.y });
        return { ...next, ...snapped };
      }),
    });
    schedulePersist(() => get().persistNow());
  },

  resizeAsset: (id, w) => {
    set({
      assets: get().assets.map((a) => {
        if (a.id !== id) return a;
        dirty.set(id, { w });
        return { ...a, w };
      }),
    });
    schedulePersist(() => get().persistNow());
  },

  commitHistory: (entry) => {
    set({ history: [...get().history, entry], future: [] });
  },

  persistNow: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (dirty.size === 0) return;
    const patches = [...dirty.entries()].map(([id, fields]) => ({ id, fields }));
    dirty.clear();
    void getRepo().updateAssets(patches);
  },

  updateFields: (id, fields, recordHistory = true) => {
    const current = get().assets.find((a) => a.id === id);
    if (!current) return;
    if (recordHistory) {
      const before: Partial<FieldPatch> = {};
      const after: Partial<FieldPatch> = {};
      (Object.keys(fields) as (keyof FieldPatch)[]).forEach((k) => {
        const prev = current[k];
        (before as Record<keyof FieldPatch, FieldPatch[keyof FieldPatch] | undefined>)[k] =
          prev === null ? undefined : prev;
        (after as Record<keyof FieldPatch, FieldPatch[keyof FieldPatch] | undefined>)[k] =
          fields[k] === null ? undefined : fields[k];
      });
      get().commitHistory({ kind: "fields", id, before, after });
    }
    set({
      assets: get().assets.map((a) => (a.id === id ? { ...a, ...fields } : a)),
    });
    dirty.set(id, { ...dirty.get(id), ...fields });
    schedulePersist(() => get().persistNow());
    if (fields.model) {
      const m = fields.model.trim();
      if (m && !get().models.includes(m)) set({ models: [...get().models, m] });
    }
  },

  addTagToSelection: async (name, kind = "free", categoryKey = null) => {
    const ids = get().selectedIds;
    if (ids.length === 0 || !name.trim()) return;
    const repo = getRepo();
    const tag = await repo.upsertTag(name, kind, categoryKey);
    const missing = ids.filter(
      (id) => !get().assetTags.some((at) => at.asset_id === id && at.tag_id === tag.id),
    );
    await Promise.all(missing.map((id) => repo.addAssetTag(id, tag.id)));
    const tags = get().tags.some((t) => t.id === tag.id)
      ? get().tags.map((t) =>
          t.id === tag.id ? { ...t, use_count: t.use_count + missing.length } : t,
        )
      : [...get().tags, { ...tag, use_count: missing.length }];
    const extra: AssetTag[] = missing.map((asset_id) => ({
      asset_id,
      tag_id: tag.id,
      source: "user" as const,
    }));
    set({
      tags,
      assetTags: [...get().assetTags, ...extra],
    });
    if (missing.length > 0) {
      get().commitHistory({ kind: "tag-add", assetIds: missing, tagId: tag.id });
    }
  },

  toggleTagOnSelection: async (tagId) => {
    const ids = get().selectedIds;
    if (ids.length === 0) return;
    const repo = getRepo();
    const allHave = ids.every((id) =>
      get().assetTags.some((at) => at.asset_id === id && at.tag_id === tagId),
    );
    if (allHave) {
      await Promise.all(ids.map((id) => repo.removeAssetTag(id, tagId)));
      set({
        assetTags: get().assetTags.filter(
          (at) => !(at.tag_id === tagId && ids.includes(at.asset_id)),
        ),
        tags: get().tags.map((t) =>
          t.id === tagId ? { ...t, use_count: Math.max(0, t.use_count - ids.length) } : t,
        ),
      });
      get().commitHistory({ kind: "tag-remove", assetIds: ids, tagId });
      return;
    }
    const missing = ids.filter(
      (id) => !get().assetTags.some((at) => at.asset_id === id && at.tag_id === tagId),
    );
    await Promise.all(missing.map((id) => repo.addAssetTag(id, tagId)));
    set({
      assetTags: [
        ...get().assetTags,
        ...missing.map((asset_id) => ({
          asset_id,
          tag_id: tagId,
          source: "user" as const,
        })),
      ],
      tags: get().tags.map((t) =>
        t.id === tagId ? { ...t, use_count: t.use_count + missing.length } : t,
      ),
    });
    get().commitHistory({ kind: "tag-add", assetIds: missing, tagId });
  },

  createTag: async (name, kind, categoryKey = null) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const tag = await getRepo().upsertTag(trimmed, kind, categoryKey);
      if (!get().tags.some((t) => t.id === tag.id)) {
        set({ tags: [...get().tags, tag] });
      }
      return tag;
    } catch {
      return null;
    }
  },

  renameTag: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    try {
      const tag = await getRepo().updateTag(id, { name: trimmed });
      set({ tags: get().tags.map((t) => (t.id === id ? { ...t, name: tag.name } : t)) });
      return true;
    } catch {
      return false;
    }
  },

  setTagKind: async (id, kind) => {
    const tag = await getRepo().updateTag(id, { kind });
    set({ tags: get().tags.map((t) => (t.id === id ? { ...t, kind: tag.kind } : t)) });
  },

  deleteTag: async (id) => {
    await getRepo().deleteTag(id);
    set({
      tags: get().tags.filter((t) => t.id !== id),
      assetTags: get().assetTags.filter((at) => at.tag_id !== id),
      filterTagIds: get().filterTagIds.filter((fid) => fid !== id),
    });
  },

  removeTag: async (assetId, tagId) => {
    await getRepo().removeAssetTag(assetId, tagId);
    set({
      assetTags: get().assetTags.filter(
        (at) => !(at.asset_id === assetId && at.tag_id === tagId),
      ),
      tags: get().tags.map((t) =>
        t.id === tagId ? { ...t, use_count: Math.max(0, t.use_count - 1) } : t,
      ),
    });
    get().commitHistory({
      kind: "tag-remove",
      assetIds: [assetId],
      tagId,
    });
  },

  deleteSelection: async () => {
    const ids = get().selectedIds;
    if (ids.length === 0) return;
    for (const a of get().assets) {
      if (ids.includes(a.id)) deletedCache.set(a.id, a);
    }
    set({
      assets: get().assets.filter((a) => !ids.includes(a.id)),
      selectedIds: [],
      undoToast: { ids, label: `${ids.length}` },
    });
    get().commitHistory({ kind: "delete", ids });
    await getRepo().softDelete(ids);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ undoToast: null }), UNDO_TOAST_MS);
  },

  moveSelectionToBoard: async (targetBoardId) => {
    const ids = get().selectedIds;
    const fromBoardId = get().boardId;
    if (ids.length === 0 || !fromBoardId || targetBoardId === fromBoardId) return;

    const targetBoard = get().boards.find((board) => board.id === targetBoardId);
    if (!targetBoard) {
      toast.error(S.moveBoardMissing);
      return;
    }

    const idSet = new Set(ids);
    const moving = get().assets.filter((asset) => idSet.has(asset.id));
    if (moving.length === 0) return;

    const snapshots = moving.map((asset) => ({ ...asset, board_id: targetBoardId }));
    try {
      await getRepo().updateAssets(
        moving.map((asset) => ({ id: asset.id, fields: { board_id: targetBoardId } })),
      );
    } catch (err) {
      console.error("[canvas] board move failed", err);
      toast.error(S.moveBoardFailed);
      return;
    }

    set({
      assets: get().assets.filter((asset) => !idSet.has(asset.id)),
      selectedIds: [],
    });
    get().commitHistory({
      kind: "board-move",
      assets: snapshots,
      fromBoardId,
      toBoardId: targetBoardId,
    });

    toast.success(S.movedToBoard(moving.length, targetBoard.name));
  },

  undo: async () => {
    const entry = get().history.at(-1);
    if (!entry) return;
    set({ history: get().history.slice(0, -1), future: [...get().future, entry] });
    await applyInverse(entry, set, get);
  },

  redo: async () => {
    const entry = get().future.at(-1);
    if (!entry) return;
    set({ future: get().future.slice(0, -1), history: [...get().history, entry] });
    await applyForward(entry, set, get);
  },

  addAssets: (incoming) => {
    set({ assets: [...get().assets, ...incoming] });
  },
  setUploads: (uploads) => set({ uploads }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setLightboxId: (lightboxId) => set({ lightboxId }),
  dismissUndoToast: () => set({ undoToast: null }),

  toggleAttrFilter: (key, value) => {
    const def = [...CHARACTER_ATTRIBUTES, ...WARDROBE_ATTRIBUTES].find((a) => a.key === key);
    const cur = get().attrFilters[key] ?? [];
    const on = cur.includes(value);
    const next = !def?.multi
      ? on
        ? []
        : [value]
      : on
        ? cur.filter((v) => v !== value)
        : [...cur, value];
    set({ attrFilters: { ...get().attrFilters, [key]: next } });
  },
  clearAttrFilters: () => set({ attrFilters: {} }),
  toggleAssetAttr: (assetId, key, value) => {
    const asset = get().assets.find((a) => a.id === assetId);
    if (!asset) return;
    const attributes = toggleAttribute(asset.attributes ?? {}, key, value);
    get().updateFields(assetId, { attributes }, false);
  },
  applyAttrToSelection: (key, value) => {
    const ids = get().selectedIds;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const selected = get().assets.filter((a) => idSet.has(a.id));
    if (selected.length === 0) return;
    const allHave = selected.every((a) => attrValues(a.attributes, key).includes(value));
    const mode = allHave ? "clear" : "set";
    for (const asset of selected) {
      const attributes = applyAttribute(asset.attributes ?? {}, key, value, mode);
      get().updateFields(asset.id, { attributes }, false);
    }
  },
  setCharacterDialogOpen: (characterDialogOpen) => set({ characterDialogOpen }),
  saveCharacter: async (input) => {
    const ids = get().selectedIds;
    if (ids.length === 0 || !input.name.trim()) return;
    const repo = getRepo();
    const id = input.id ?? crypto.randomUUID();
    const row = await repo.upsertCharacter({
      id,
      name: input.name.trim(),
      notes: "",
      attributes: input.attributes,
      cover_asset_id: ids[0] ?? null,
      base_prompt: input.base_prompt,
    });
    await repo.setCharacterAssets(
      id,
      ids.map((asset_id) => ({ asset_id, role: "other" as const })),
    );
    await repo.updateAssets(
      ids.map((assetId) => ({
        id: assetId,
        fields: { attributes: input.attributes, is_character: true },
      })),
    );
    const links: CharacterAsset[] = [
      ...get().characterAssets.filter((l) => l.character_id !== id),
      ...ids.map((asset_id) => ({
        character_id: id,
        asset_id,
        role: "other" as const,
      })),
    ];
    set({
      characters: [
        ...get().characters.filter((c) => c.id !== id),
        row,
      ],
      characterAssets: links,
      assets: get().assets.map((a) =>
        ids.includes(a.id)
          ? { ...a, attributes: input.attributes, is_character: true }
          : a,
      ),
      characterDialogOpen: false,
    });
  },
  deleteCharacter: async (id) => {
    await getRepo().deleteCharacter(id);
    set({
      characters: get().characters.filter((c) => c.id !== id),
      characterAssets: get().characterAssets.filter((l) => l.character_id !== id),
    });
  },
  selectCharacter: (id) => {
    const assetIds = get()
      .characterAssets.filter((l) => l.character_id === id)
      .map((l) => l.asset_id);
    get().select(assetIds);
  },

  selectPrompt: (id) => set({ selectedPromptId: id }),

  toggleFilterSheetType: (type) => {
    const cur = get().filterSheetTypes;
    set({
      filterSheetTypes: cur.includes(type)
        ? cur.filter((x) => x !== type)
        : [...cur, type],
    });
  },

  createPromptSheet: async (type = "other") => {
    const boardId = get().boardId;
    if (!boardId) return;
    const id = crypto.randomUUID();
    const row = await getRepo().upsertPromptSheet({
      id,
      board_id: boardId,
      title: "",
      body: "",
      negative_prompt: "",
      model: "",
      notes: "",
      sheet_type: type,
      preview_path: null,
    });
    set({
      promptSheets: [row, ...get().promptSheets],
      selectedPromptId: id,
    });
  },

  updatePromptSheet: async (id, fields) => {
    const current = get().promptSheets.find((p) => p.id === id);
    if (!current) return;
    const row = await getRepo().upsertPromptSheet({ ...current, ...fields });
    set({
      promptSheets: get().promptSheets.map((p) => (p.id === id ? row : p)),
    });
  },

  deletePromptSheet: async (id) => {
    await getRepo().deletePromptSheet(id);
    set({
      promptSheets: get().promptSheets.filter((p) => p.id !== id),
      selectedPromptId: get().selectedPromptId === id ? null : get().selectedPromptId,
    });
  },

  uploadPromptPreview: async (id, file) => {
    const row = await getRepo().setPromptPreview(id, file);
    set({
      promptSheets: get().promptSheets.map((p) => (p.id === id ? row : p)),
    });
  },

  analyzeAsset: async (assetId) => {
    const asset = get().assets.find((a) => a.id === assetId);
    if (!asset || asset.kind !== "image") return;
    set({ analyzingAssetId: assetId });
    try {
      const src = asset.thumbUrl || asset.url;
      const { data, mimeType } = await fetchImageBase64(src);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, imageBase64: data, mimeType }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: ReverseAnalysis;
        error?: string;
      };
      if (!res.ok || !json.analysis) {
        throw new Error(json.error ?? "analyze_failed");
      }
      set({
        analyses: { ...get().analyses, [assetId]: json.analysis },
      });
      await get().applyAnalysis(assetId, { prompt: true, tags: true });
    } finally {
      set({ analyzingAssetId: null });
    }
  },

  analyzeWardrobeAsset: async (assetId) => {
    const asset = get().assets.find((a) => a.id === assetId);
    if (!asset || asset.kind !== "image") return;
    set({ analyzingAssetId: assetId });
    try {
      const src = asset.thumbUrl || asset.url;
      const { data, mimeType } = await fetchImageBase64(src);
      const res = await fetch("/api/analyze-wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, imageBase64: data, mimeType }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: WardrobeAnalysisInput;
        error?: string;
      };
      if (!res.ok || !json.analysis) {
        throw new Error(json.error ?? "wardrobe_analyze_failed");
      }
      const a = json.analysis;
      const attributes: AttributeMap = {
        item_type: a.item_type,
        style_vibe: a.styling_vibe,
        main_color: a.colors,
        material: a.materials,
      };
      get().updateFields(assetId, {
        title: asset.title || a.summary_ko,
        attributes,
      });
      get().select([assetId]);
      for (const tagName of a.suggested_tags.slice(0, 8)) {
        await get().addTagToSelection(tagName, "free");
      }
    } finally {
      set({ analyzingAssetId: null });
    }
  },

  applyAnalysis: async (assetId, opts) => {
    const analysis = get().analyses[assetId];
    if (!analysis) return;
    if (opts.prompt) {
      get().updateFields(assetId, {
        prompt: analysis.final_prompt,
        negative_prompt: analysis.negative_prompt ?? "",
      });
    }
    if (opts.tags) {
      get().select([assetId]);
      const tagPairs: { name: string; kind: Tag["kind"] }[] = [
        ...analysis.suggested_tags.map((name) => ({ name, kind: "free" as const })),
        ...analysis.keywords.map((kw) => ({ name: kw.term, kind: kw.kind })),
      ];
      const seen = new Set<string>();
      for (const { name, kind } of tagPairs) {
        const key = name.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        await get().addTagToSelection(name.trim(), kind);
      }
    }
  },
}));

type SetFn = (partial: Partial<CanvasState> | ((s: CanvasState) => Partial<CanvasState>)) => void;
type GetFn = () => CanvasState;

async function applyInverse(entry: HistoryEntry, set: SetFn, get: GetFn) {
  const repo = getRepo();
  if (entry.kind === "move") {
    const map = new Map(entry.before.map((b) => [b.id, b]));
    set({
      assets: get().assets.map((a) => {
        const b = map.get(a.id);
        return b ? { ...a, ...b } : a;
      }),
    });
    await repo.updateAssets(entry.before.map((b) => ({ id: b.id, fields: b })));
  } else if (entry.kind === "delete") {
    const restored = entry.ids
      .map((id) => deletedCache.get(id))
      .filter((a): a is Asset => Boolean(a));
    set({ assets: [...get().assets, ...restored], undoToast: null });
    await repo.restore(entry.ids);
  } else if (entry.kind === "restore") {
    set({ assets: get().assets.filter((a) => !entry.ids.includes(a.id)) });
    await repo.softDelete(entry.ids);
  } else if (entry.kind === "tag-add") {
    for (const id of entry.assetIds) await repo.removeAssetTag(id, entry.tagId);
    set({
      assetTags: get().assetTags.filter(
        (at) => !(at.tag_id === entry.tagId && entry.assetIds.includes(at.asset_id)),
      ),
    });
  } else if (entry.kind === "tag-remove") {
    for (const id of entry.assetIds) await repo.addAssetTag(id, entry.tagId);
    set({
      assetTags: [
        ...get().assetTags,
        ...entry.assetIds.map((asset_id) => ({
          asset_id,
          tag_id: entry.tagId,
          source: "user" as const,
        })),
      ],
    });
  } else if (entry.kind === "fields") {
    set({
      assets: get().assets.map((a) =>
        a.id === entry.id ? { ...a, ...entry.before } : a,
      ),
    });
    await repo.updateAssets([{ id: entry.id, fields: entry.before }]);
  } else if (entry.kind === "board-move") {
    const currentBoardId = get().boardId;
    await repo.updateAssets(
      entry.assets.map((asset) => ({
        id: asset.id,
        fields: { board_id: entry.fromBoardId },
      })),
    );
    const restored = entry.assets.map((asset) => ({ ...asset, board_id: entry.fromBoardId }));
    const restoreIds = new Set(restored.map((asset) => asset.id));
    if (currentBoardId === entry.fromBoardId) {
      set({ assets: [...get().assets, ...restored] });
    } else if (currentBoardId === entry.toBoardId) {
      set({ assets: get().assets.filter((asset) => !restoreIds.has(asset.id)) });
    }
  }
}

async function applyForward(entry: HistoryEntry, set: SetFn, get: GetFn) {
  const repo = getRepo();
  if (entry.kind === "move") {
    const map = new Map(entry.after.map((b) => [b.id, b]));
    set({
      assets: get().assets.map((a) => {
        const b = map.get(a.id);
        return b ? { ...a, ...b } : a;
      }),
    });
    await repo.updateAssets(entry.after.map((b) => ({ id: b.id, fields: b })));
  } else if (entry.kind === "delete") {
    set({ assets: get().assets.filter((a) => !entry.ids.includes(a.id)) });
    await repo.softDelete(entry.ids);
  } else if (entry.kind === "restore") {
    const restored = entry.ids
      .map((id) => deletedCache.get(id))
      .filter((a): a is Asset => Boolean(a));
    set({ assets: [...get().assets, ...restored] });
    await repo.restore(entry.ids);
  } else if (entry.kind === "tag-add") {
    for (const id of entry.assetIds) await repo.addAssetTag(id, entry.tagId);
    set({
      assetTags: [
        ...get().assetTags,
        ...entry.assetIds.map((asset_id) => ({
          asset_id,
          tag_id: entry.tagId,
          source: "user" as const,
        })),
      ],
    });
  } else if (entry.kind === "tag-remove") {
    for (const id of entry.assetIds) await repo.removeAssetTag(id, entry.tagId);
    set({
      assetTags: get().assetTags.filter(
        (at) => !(at.tag_id === entry.tagId && entry.assetIds.includes(at.asset_id)),
      ),
    });
  } else if (entry.kind === "fields") {
    set({
      assets: get().assets.map((a) =>
        a.id === entry.id ? { ...a, ...entry.after } : a,
      ),
    });
    await repo.updateAssets([{ id: entry.id, fields: entry.after }]);
  } else if (entry.kind === "board-move") {
    const currentBoardId = get().boardId;
    await repo.updateAssets(
      entry.assets.map((asset) => ({
        id: asset.id,
        fields: { board_id: entry.toBoardId },
      })),
    );
    const moved = entry.assets;
    const movedIds = new Set(moved.map((asset) => asset.id));
    if (currentBoardId === entry.toBoardId) {
      set({ assets: [...get().assets, ...moved] });
    } else if (currentBoardId === entry.fromBoardId) {
      set({ assets: get().assets.filter((asset) => !movedIds.has(asset.id)) });
    }
  }
}

export function filteredAssets(state: CanvasState): Asset[] {
  let list = state.assets;
  const ids = list.map((asset) => asset.id);

  if (state.filterTagIds.length > 0) {
    const matched = filterAssetsByTags(
      ids,
      state.assetTags,
      state.tags,
      state.filterTagIds,
    );
    list = list.filter((asset) => matched.has(asset.id));
  } else if (state.filterKinds.length > 0 || state.filterCustomTabs.length > 0) {
    const activeTabs = [...state.filterKinds, ...state.filterCustomTabs];
    const matched = coarseTagTabFilter(
      ids,
      state.assetTags,
      state.tags,
      activeTabs,
    );
    list = list.filter((asset) => matched.has(asset.id));
  }

  if (hasAttrFilters(state.attrFilters)) {
    list = list.filter((asset) => matchesAttributes(asset.attributes, state.attrFilters));
  }
  return list;
}

export { isPeopleBoard, isWardrobeBoard, isPromptsBoard } from "@/lib/board-kind";

export function filteredPromptSheets(state: CanvasState): PromptSheet[] {
  const { filterSheetTypes } = state;
  if (filterSheetTypes.length === 0) return state.promptSheets;
  return state.promptSheets.filter((p) => filterSheetTypes.includes(p.sheet_type));
}
