import { createClient } from "@/lib/supabase/client";
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
import { extOf } from "@/lib/env";

type AssetRow = Omit<Asset, "url" | "thumbUrl">;

function publicUrl(
  supabase: ReturnType<typeof createClient>,
  path: string | null,
): string {
  if (!path) return "";
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

function hydrate(
  supabase: ReturnType<typeof createClient>,
  row: AssetRow,
): Asset {
  const url = publicUrl(supabase, row.storage_path);
  const thumbUrl = row.thumb_path ? publicUrl(supabase, row.thumb_path) : url;
  return { ...row, attributes: row.attributes ?? {}, url, thumbUrl };
}

export function createSupabaseRepo(): LibraryRepo {
  const supabase = createClient();

  async function requireUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("not authenticated");
    return data.user.id;
  }

  return {
    mode: "cloud",
    getUserId: requireUserId,
    async listBoards() {
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const boards = (data as Board[]).map((b) => ({
          ...b,
          kind: b.kind ?? "canvas",
        }));
        if (!boards.some((b) => b.kind === "characters")) {
          const { data: people, error: pErr } = await supabase
            .from("boards")
            .insert({
              user_id,
              name: S.peopleBoard,
              emoji: S.peopleBoardEmoji,
              kind: "characters",
            })
            .select("*")
            .single();
          if (pErr) throw pErr;
          boards.push(people as Board);
        }
        if (!boards.some((b) => b.kind === "wardrobe")) {
          const { data: wardrobe, error: wErr } = await supabase
            .from("boards")
            .insert({
              user_id,
              name: S.wardrobeBoard,
              emoji: S.wardrobeBoardEmoji,
              kind: "wardrobe",
            })
            .select("*")
            .single();
          if (wErr) throw wErr;
          boards.push(wardrobe as Board);
        }
        return boards;
      }
      const { data: created, error: insertError } = await supabase
        .from("boards")
        .insert({
          user_id,
          name: S.defaultBoard,
          emoji: S.defaultBoardEmoji,
          kind: "canvas",
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      const { data: people, error: pErr } = await supabase
        .from("boards")
        .insert({
          user_id,
          name: S.peopleBoard,
          emoji: S.peopleBoardEmoji,
          kind: "characters",
        })
        .select("*")
        .single();
      if (pErr) throw pErr;
      const { data: wardrobe, error: wErr } = await supabase
        .from("boards")
        .insert({
          user_id,
          name: S.wardrobeBoard,
          emoji: S.wardrobeBoardEmoji,
          kind: "wardrobe",
        })
        .select("*")
        .single();
      if (wErr) throw wErr;
      return [created as Board, people as Board, wardrobe as Board];
    },
    async createBoard(name, emoji, kind: BoardKind = "canvas") {
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("boards")
        .insert({ user_id, name, emoji, kind })
        .select("*")
        .single();
      if (error) throw error;
      return data as Board;
    },
    async listAssets(boardId) {
      let q = supabase.from("assets").select("*").is("deleted_at", null);
      if (boardId !== "all") q = q.eq("board_id", boardId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as AssetRow[]).map((row) => hydrate(supabase, row));
    },
    async listTags() {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
    async listAssetTags() {
      const { data, error } = await supabase.from("asset_tags").select("*");
      if (error) throw error;
      return (data ?? []) as AssetTag[];
    },
    async findByHash(hash) {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("file_hash", hash)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ? hydrate(supabase, data as AssetRow) : null;
    },
    async insertAsset(input: NewAssetInput, boardId: string) {
      const user_id = await requireUserId();
      const ext = extOf(input.file.name, input.file.type);
      const storage_path = `${user_id}/${input.id}.${ext}`;
      const thumb_path = `${user_id}/thumbs/${input.id}.webp`;
      const up1 = await supabase.storage
        .from("media")
        .upload(storage_path, input.file, { contentType: input.file.type, upsert: false });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage
        .from("media")
        .upload(thumb_path, input.thumb, { contentType: "image/webp", upsert: true });
      if (up2.error) throw up2.error;
      const { data: boardRow } = await supabase
        .from("boards")
        .select("kind")
        .eq("id", boardId)
        .maybeSingle();
      const row = {
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
        is_character: boardRow?.kind === "characters",
        attributes: {},
        file_hash: input.file_hash,
        deleted_at: null,
      };
      const { data, error } = await supabase
        .from("assets")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      return hydrate(supabase, data as AssetRow);
    },
    async updateAssets(patches) {
      await Promise.all(
        patches.map(async ({ id, fields }) => {
          const rest: Partial<Asset> = { ...fields };
          delete rest.url;
          delete rest.thumbUrl;
          delete rest.id;
          delete rest.user_id;
          delete rest.created_at;
          if (Object.keys(rest).length === 0) return;
          const { error } = await supabase.from("assets").update(rest).eq("id", id);
          if (error) throw error;
        }),
      );
    },
    async softDelete(ids) {
      const stamp = new Date().toISOString();
      const { error } = await supabase
        .from("assets")
        .update({ deleted_at: stamp })
        .in("id", ids);
      if (error) throw error;
    },
    async restore(ids) {
      const { error } = await supabase
        .from("assets")
        .update({ deleted_at: null })
        .in("id", ids);
      if (error) throw error;
    },
    async upsertTag(name, kind: TagKind = "free") {
      const user_id = await requireUserId();
      const trimmed = name.trim();
      const { data: existing } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user_id)
        .ilike("name", trimmed)
        .maybeSingle();
      if (existing) return existing as Tag;
      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id, name: trimmed, kind, color: "#D9B382" })
        .select("*")
        .single();
      if (error) throw error;
      return data as Tag;
    },
    async updateTag(id, fields) {
      const patch: { name?: string; kind?: TagKind } = {};
      if (fields.name) patch.name = fields.name.trim();
      if (fields.kind) patch.kind = fields.kind;
      const { data, error } = await supabase
        .from("tags")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("tag exists");
        throw error;
      }
      return data as Tag;
    },
    async deleteTag(id) {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    async addAssetTag(assetId, tagId) {
      const { error } = await supabase.from("asset_tags").insert({
        asset_id: assetId,
        tag_id: tagId,
        source: "user",
      });
      if (error && error.code !== "23505") throw error;
    },
    async removeAssetTag(assetId, tagId) {
      const { error } = await supabase
        .from("asset_tags")
        .delete()
        .eq("asset_id", assetId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    async listModels() {
      const { data, error } = await supabase
        .from("assets")
        .select("model")
        .is("deleted_at", null)
        .neq("model", "");
      if (error) throw error;
      return [...new Set((data ?? []).map((r: { model: string }) => r.model).filter(Boolean))];
    },
    async listCharacters() {
      const { data, error } = await supabase.from("characters").select("*");
      if (error) throw error;
      return ((data ?? []) as Character[]).map((c) => ({
        ...c,
        attributes: c.attributes ?? {},
      }));
    },
    async listCharacterAssets() {
      const { data, error } = await supabase.from("character_assets").select("*");
      if (error) throw error;
      return (data ?? []) as CharacterAsset[];
    },
    async upsertCharacter(input) {
      const user_id = await requireUserId();
      const row = {
        id: input.id,
        user_id,
        name: input.name,
        notes: input.notes,
        attributes: input.attributes,
        cover_asset_id: input.cover_asset_id,
        base_prompt: input.base_prompt,
      };
      const { data, error } = await supabase
        .from("characters")
        .upsert(row)
        .select("*")
        .single();
      if (error) throw error;
      return data as Character;
    },
    async deleteCharacter(id) {
      const { error } = await supabase.from("characters").delete().eq("id", id);
      if (error) throw error;
    },
    async setCharacterAssets(characterId, links) {
      const { error: delErr } = await supabase
        .from("character_assets")
        .delete()
        .eq("character_id", characterId);
      if (delErr) throw delErr;
      if (links.length === 0) return;
      const { error } = await supabase.from("character_assets").insert(
        links.map((l) => ({
          character_id: characterId,
          asset_id: l.asset_id,
          role: l.role,
        })),
      );
      if (error) throw error;
    },
  };
}
