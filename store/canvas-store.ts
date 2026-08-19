"use client";

import { create } from "zustand";
import { PERSIST_MS, UNDO_TOAST_MS } from "@/lib/constants";
import { getRepo } from "@/lib/data/get-repo";
import { ensureSeeded, ensureStarterTags } from "@/lib/seed-local";
import { matchesAttributes, hasAttrFilters, toggleAttribute } from "@/lib/attributes";
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
  addTagToSelection: (name: string, kind?: Tag["kind"]) => Promise<void>;
  toggleTagOnSelection: (tagId: string) => Promise<void>;
  createTag: (name: string, kind: Tag["kind"]) => Promise<Tag | null>;
  renameTag: (id: string, name: string) => Promise<boolean>;
  setTagKind: (id: string, kind: Tag["kind"]) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  removeTag: (assetId: string, tagId: string) => Promise<void>;
  deleteSelection: () => Promise<void>;
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
  setCharacterDialogOpen: (open: boolean) => void;
  saveCharacter: (input: {
    name: string;
    attributes: AttributeMap;
    base_prompt: string;
    id?: string;
  }) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  selectCharacter: (id: string) => void;
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
  history: [],
  future: [],

  load: async () => {
    const repo = getRepo();
    const boards = await repo.listBoards();
    const boardId = boards[0]?.id ?? null;
    if (!boardId) {
      set({ ready: true, mode: repo.mode, boards });
      return;
    }
    const seeded = await ensureSeeded(repo, boardId);
    await ensureStarterTags(repo);
    const [assets, tags, assetTags, models, characters, characterAssets] = await Promise.all([
      repo.listAssets(boardId),
      repo.listTags(),
      repo.listAssetTags(),
      repo.listModels(),
      repo.listCharacters(),
      repo.listCharacterAssets(),
    ]);
    void seeded;
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
      camera: readCamera(boardId),
    });
  },

  setBoard: async (id) => {
    const repo = getRepo();
    const [assets, tags, assetTags] = await Promise.all([
      repo.listAssets(id),
      repo.listTags(),
      repo.listAssetTags(),
    ]);
    get().persistNow();
    set({
      boardId: id,
      assets,
      tags,
      assetTags,
      selectedIds: [],
      camera: readCamera(id),
      filterKinds: [],
      filterTagIds: [],
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
  toggleFilterTag: (id) => {
    const cur = get().filterTagIds;
    set({
      filterTagIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  },
  clearFilters: () => set({ filterKinds: [], filterTagIds: [] }),
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

  addTagToSelection: async (name, kind = "free") => {
    const ids = get().selectedIds;
    if (ids.length === 0 || !name.trim()) return;
    const repo = getRepo();
    const tag = await repo.upsertTag(name, kind);
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

  createTag: async (name, kind) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const tag = await getRepo().upsertTag(trimmed, kind);
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
  }
}

export function filteredAssets(state: CanvasState): Asset[] {
  let list = state.assets;
  if (state.filterKinds.length > 0) {
    const tagById = new Map(state.tags.map((tag) => [tag.id, tag]));
    const byAssetKinds = new Map<string, Set<Tag["kind"]>>();
    for (const at of state.assetTags) {
      const tag = tagById.get(at.tag_id);
      if (!tag) continue;
      const set = byAssetKinds.get(at.asset_id) ?? new Set<Tag["kind"]>();
      set.add(tag.kind);
      byAssetKinds.set(at.asset_id, set);
    }
    list = list.filter((asset) => {
      const kinds = byAssetKinds.get(asset.id);
      return state.filterKinds.some((kind) => kinds?.has(kind));
    });
  }
  if (state.filterTagIds.length > 0) {
    const byAsset = new Map<string, Set<string>>();
    for (const at of state.assetTags) {
      const set = byAsset.get(at.asset_id) ?? new Set<string>();
      set.add(at.tag_id);
      byAsset.set(at.asset_id, set);
    }
    list = list.filter((a) => {
      const tags = byAsset.get(a.id);
      return state.filterTagIds.every((id) => tags?.has(id));
    });
  }
  if (hasAttrFilters(state.attrFilters)) {
    list = list.filter((a) => matchesAttributes(a.attributes, state.attrFilters));
  }
  return list;
}

export function isPeopleBoard(board: Board | undefined): boolean {
  return board?.kind === "characters";
}

export function isWardrobeBoard(board: Board | undefined): boolean {
  return board?.kind === "wardrobe";
}
