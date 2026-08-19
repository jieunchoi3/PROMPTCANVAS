import { S } from "@/lib/strings";
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
import type { LibraryRepo } from "@/lib/data/repo";

const DB_NAME = "prompt-canvas";
const DB_VERSION = 2;
const USER_KEY = "pc.localUserId";

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb error"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb tx error"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx abort"));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("boards")) {
        db.createObjectStore("boards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("tags")) {
        db.createObjectStore("tags", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("asset_tags")) {
        db.createObjectStore("asset_tags", { keyPath: ["asset_id", "tag_id"] });
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "path" });
      }
      if (!db.objectStoreNames.contains("characters")) {
        db.createObjectStore("characters", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("character_assets")) {
        db.createObjectStore("character_assets", {
          keyPath: ["character_id", "asset_id"],
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
  return dbPromise;
}

const urlCache = new Map<string, string>();

async function blobUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const db = await openDb();
  const row = await request<{ path: string; blob: Blob } | undefined>(
    db.transaction("blobs").objectStore("blobs").get(path),
  );
  if (!row) return "";
  const url = URL.createObjectURL(row.blob);
  urlCache.set(path, url);
  return url;
}

async function hydrate(asset: Omit<Asset, "url" | "thumbUrl">): Promise<Asset> {
  const url = await blobUrl(asset.storage_path);
  const thumbUrl = asset.thumb_path ? await blobUrl(asset.thumb_path) : url;
  return { ...asset, attributes: asset.attributes ?? {}, url, thumbUrl };
}

function hydrateBoard(board: Board): Board {
  return { ...board, kind: board.kind ?? "canvas" };
}

function localUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function createLocalRepo(): LibraryRepo {
  return {
    mode: "local",
    async getUserId() {
      return localUserId();
    },
    async listBoards() {
      const db = await openDb();
      const rows = (
        await request<Board[]>(db.transaction("boards").objectStore("boards").getAll())
      ).map(hydrateBoard);
      const user_id = localUserId();
      const next = [...rows];
      if (next.length === 0) {
        const board: Board = {
          id: uuid(),
          user_id,
          name: S.defaultBoard,
          emoji: S.defaultBoardEmoji,
          kind: "canvas",
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        const tx = db.transaction("boards", "readwrite");
        tx.objectStore("boards").put(board);
        await txDone(tx);
        next.push(board);
      }
      if (!next.some((b) => b.kind === "characters")) {
        const people: Board = {
          id: uuid(),
          user_id,
          name: S.peopleBoard,
          emoji: S.peopleBoardEmoji,
          kind: "characters",
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        const tx = db.transaction("boards", "readwrite");
        tx.objectStore("boards").put(people);
        await txDone(tx);
        next.push(people);
      }
      if (!next.some((b) => b.kind === "wardrobe")) {
        const wardrobe: Board = {
          id: uuid(),
          user_id,
          name: S.wardrobeBoard,
          emoji: S.wardrobeBoardEmoji,
          kind: "wardrobe",
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        const tx = db.transaction("boards", "readwrite");
        tx.objectStore("boards").put(wardrobe);
        await txDone(tx);
        next.push(wardrobe);
      }
      return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async createBoard(name, emoji, kind: BoardKind = "canvas") {
      const db = await openDb();
      const board: Board = {
        id: uuid(),
        user_id: localUserId(),
        name,
        emoji,
        kind,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      const tx = db.transaction("boards", "readwrite");
      tx.objectStore("boards").put(board);
      await txDone(tx);
      return board;
    },
    async listAssets(boardId) {
      const db = await openDb();
      const rows = await request<Omit<Asset, "url" | "thumbUrl">[]>(
        db.transaction("assets").objectStore("assets").getAll(),
      );
      const filtered = rows.filter(
        (a) =>
          !a.deleted_at && (boardId === "all" || a.board_id === boardId),
      );
      return Promise.all(filtered.map(hydrate));
    },
    async listTags() {
      const db = await openDb();
      return request<Tag[]>(db.transaction("tags").objectStore("tags").getAll());
    },
    async listAssetTags() {
      const db = await openDb();
      return request<AssetTag[]>(
        db.transaction("asset_tags").objectStore("asset_tags").getAll(),
      );
    },
    async findByHash(hash) {
      const db = await openDb();
      const rows = await request<Omit<Asset, "url" | "thumbUrl">[]>(
        db.transaction("assets").objectStore("assets").getAll(),
      );
      const hit = rows.find((a) => a.file_hash === hash && !a.deleted_at);
      return hit ? hydrate(hit) : null;
    },
    async insertAsset(input: NewAssetInput, boardId: string) {
      const user_id = localUserId();
      const ext = input.file.name.split(".").pop()?.toLowerCase() || "png";
      const storage_path = `${user_id}/${input.id}.${ext}`;
      const thumb_path = `${user_id}/thumbs/${input.id}.webp`;
      const db = await openDb();
      const board = hydrateBoard(
        (await request<Board | undefined>(
          db.transaction("boards").objectStore("boards").get(boardId),
        )) ?? {
          id: boardId,
          user_id,
          name: "",
          emoji: "",
          kind: "canvas",
          created_at: nowIso(),
          updated_at: nowIso(),
        },
      );
      const tx = db.transaction(["blobs", "assets"], "readwrite");
      tx.objectStore("blobs").put({ path: storage_path, blob: input.file });
      tx.objectStore("blobs").put({ path: thumb_path, blob: input.thumb });
      const row: Omit<Asset, "url" | "thumbUrl"> = {
        id: input.id,
        user_id,
        board_id: boardId,
        kind: input.kind,
        storage_path,
        thumb_path,
        width: input.width,
        height: input.height,
        duration_ms: input.duration_ms,
        x: input.x,
        y: input.y,
        w: input.w,
        rotation: 0,
        z_index: input.z_index,
        group_id: null,
        title: input.title ?? input.file.name.replace(/\.[^.]+$/, ""),
        prompt: "",
        negative_prompt: "",
        model: "",
        source_note: "",
        is_character: board.kind === "characters",
        attributes: {},
        file_hash: input.file_hash,
        deleted_at: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      tx.objectStore("assets").put(row);
      await txDone(tx);
      urlCache.set(storage_path, URL.createObjectURL(input.file));
      urlCache.set(thumb_path, URL.createObjectURL(input.thumb));
      return hydrate(row);
    },
    async updateAssets(patches) {
      if (patches.length === 0) return;
      const db = await openDb();
      const tx = db.transaction("assets", "readwrite");
      const store = tx.objectStore("assets");
      for (const patch of patches) {
        const current = (await request<Omit<Asset, "url" | "thumbUrl"> | undefined>(
          store.get(patch.id),
        )) as Omit<Asset, "url" | "thumbUrl"> | undefined;
        if (!current) continue;
        const next = { ...current, ...patch.fields, updated_at: nowIso() };
        delete (next as Partial<Asset>).url;
        delete (next as Partial<Asset>).thumbUrl;
        store.put(next);
      }
      await txDone(tx);
    },
    async softDelete(ids) {
      const stamp = nowIso();
      await this.updateAssets(ids.map((id) => ({ id, fields: { deleted_at: stamp } })));
    },
    async restore(ids) {
      await this.updateAssets(ids.map((id) => ({ id, fields: { deleted_at: null } })));
    },
    async upsertTag(name, kind: TagKind = "free") {
      const trimmed = name.trim();
      const db = await openDb();
      const all = await request<Tag[]>(
        db.transaction("tags").objectStore("tags").getAll(),
      );
      const existing = all.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) return existing;
      const tag: Tag = {
        id: uuid(),
        user_id: localUserId(),
        name: trimmed,
        kind,
        color: "#D9B382",
        use_count: 0,
      };
      const tx = db.transaction("tags", "readwrite");
      tx.objectStore("tags").put(tag);
      await txDone(tx);
      return tag;
    },
    async updateTag(id, fields) {
      const db = await openDb();
      const current = await request<Tag | undefined>(
        db.transaction("tags").objectStore("tags").get(id),
      );
      if (!current) throw new Error("tag missing");
      if (fields.name) {
        const all = await request<Tag[]>(
          db.transaction("tags").objectStore("tags").getAll(),
        );
        const clash = all.find(
          (t) =>
            t.id !== id &&
            t.name.toLowerCase() === fields.name!.trim().toLowerCase(),
        );
        if (clash) throw new Error("tag exists");
      }
      const next: Tag = {
        ...current,
        name: fields.name?.trim() ?? current.name,
        kind: fields.kind ?? current.kind,
      };
      const tx = db.transaction("tags", "readwrite");
      tx.objectStore("tags").put(next);
      await txDone(tx);
      return next;
    },
    async deleteTag(id) {
      const db = await openDb();
      const links = await request<AssetTag[]>(
        db.transaction("asset_tags").objectStore("asset_tags").getAll(),
      );
      const tx = db.transaction(["asset_tags", "tags"], "readwrite");
      for (const link of links) {
        if (link.tag_id === id) tx.objectStore("asset_tags").delete([link.asset_id, link.tag_id]);
      }
      tx.objectStore("tags").delete(id);
      await txDone(tx);
    },
    async addAssetTag(assetId, tagId) {
      const db = await openDb();
      const existing = await request<AssetTag | undefined>(
        db
          .transaction("asset_tags")
          .objectStore("asset_tags")
          .get([assetId, tagId]),
      );
      if (existing) return;
      const tx = db.transaction(["asset_tags", "tags"], "readwrite");
      tx.objectStore("asset_tags").put({
        asset_id: assetId,
        tag_id: tagId,
        source: "user",
      });
      const tag = await request<Tag | undefined>(tx.objectStore("tags").get(tagId));
      if (tag) {
        tx.objectStore("tags").put({ ...tag, use_count: tag.use_count + 1 });
      }
      await txDone(tx);
    },
    async removeAssetTag(assetId, tagId) {
      const db = await openDb();
      const tx = db.transaction(["asset_tags", "tags"], "readwrite");
      tx.objectStore("asset_tags").delete([assetId, tagId]);
      const tag = await request<Tag | undefined>(tx.objectStore("tags").get(tagId));
      if (tag) {
        tx.objectStore("tags").put({
          ...tag,
          use_count: Math.max(0, tag.use_count - 1),
        });
      }
      await txDone(tx);
    },
    async listModels() {
      const assets = await this.listAssets("all");
      const set = new Set<string>();
      for (const a of assets) {
        if (a.model.trim()) set.add(a.model.trim());
      }
      return [...set];
    },
    async listCharacters() {
      const db = await openDb();
      return request<Character[]>(
        db.transaction("characters").objectStore("characters").getAll(),
      );
    },
    async listCharacterAssets() {
      const db = await openDb();
      return request<CharacterAsset[]>(
        db.transaction("character_assets").objectStore("character_assets").getAll(),
      );
    },
    async upsertCharacter(input) {
      const db = await openDb();
      const existing = await request<Character | undefined>(
        db.transaction("characters").objectStore("characters").get(input.id),
      );
      const row: Character = {
        id: input.id,
        user_id: localUserId(),
        name: input.name,
        notes: input.notes,
        attributes: input.attributes,
        cover_asset_id: input.cover_asset_id,
        base_prompt: input.base_prompt,
        created_at: existing?.created_at ?? input.created_at ?? nowIso(),
      };
      const tx = db.transaction("characters", "readwrite");
      tx.objectStore("characters").put(row);
      await txDone(tx);
      return row;
    },
    async deleteCharacter(id) {
      const db = await openDb();
      const links = await request<CharacterAsset[]>(
        db.transaction("character_assets").objectStore("character_assets").getAll(),
      );
      const tx = db.transaction(["character_assets", "characters"], "readwrite");
      for (const link of links) {
        if (link.character_id === id) {
          tx.objectStore("character_assets").delete([link.character_id, link.asset_id]);
        }
      }
      tx.objectStore("characters").delete(id);
      await txDone(tx);
    },
    async setCharacterAssets(characterId, links) {
      const db = await openDb();
      const existing = await request<CharacterAsset[]>(
        db.transaction("character_assets").objectStore("character_assets").getAll(),
      );
      const tx = db.transaction("character_assets", "readwrite");
      for (const link of existing) {
        if (link.character_id === characterId) {
          tx.objectStore("character_assets").delete([link.character_id, link.asset_id]);
        }
      }
      for (const link of links) {
        tx.objectStore("character_assets").put({
          character_id: characterId,
          asset_id: link.asset_id,
          role: link.role,
        });
      }
      await txDone(tx);
    },
  };
}
