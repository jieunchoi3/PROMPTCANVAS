import { createClient } from "@/lib/supabase/client";
import { PROMPT_CANVAS_MEDIA_BUCKET } from "@/lib/supabase/config";
import { resolveBoardKind } from "@/lib/board-kind";
import { S } from "@/lib/strings";
import type {
  Asset,
  AssetTag,
  Board,
  BoardKind,
  Character,
  CharacterAsset,
  NewAssetInput,
  PromptSheet,
  Tag,
  TagKind,
} from "@/lib/types";
import type { LibraryRepo } from "@/lib/data/repo";
import { extOf, sharedUserId } from "@/lib/env";
import { makeImageThumb } from "@/lib/thumbnail";

type AssetRow = Omit<Asset, "url" | "thumbUrl">;

function publicUrl(
  supabase: ReturnType<typeof createClient>,
  path: string | null,
): string {
  if (!path) return "";
  return supabase.storage.from(PROMPT_CANVAS_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

function hydratePromptSheet(
  supabase: ReturnType<typeof createClient>,
  row: PromptSheet,
): PromptSheet {
  const previewUrl = row.preview_path ? publicUrl(supabase, row.preview_path) : undefined;
  return { ...row, previewUrl: previewUrl || undefined };
}

function promptPreviewPath(userId: string, promptId: string): string {
  return `${userId}/prompts/${promptId}/preview.webp`;
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

  async function workspaceUserId(): Promise<string> {
    return sharedUserId();
  }

  return {
    mode: "cloud",
    getUserId: workspaceUserId,
    async listBoards() {
      const user_id = await workspaceUserId();
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const boards = (data as Board[]).map((b) => ({
          ...b,
          kind: resolveBoardKind(b),
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
        if (!boards.some((b) => b.kind === "prompts")) {
          const { data: prompts, error: prErr } = await supabase
            .from("boards")
            .insert({
              user_id,
              name: S.promptsBoard,
              emoji: S.promptsBoardEmoji,
              kind: "prompts",
            })
            .select("*")
            .single();
          if (prErr) throw prErr;
          boards.push(prompts as Board);
        }
        if (!boards.some((b) => b.kind === "video")) {
          const { data: video, error: vErr } = await supabase
            .from("boards")
            .insert({
              user_id,
              name: S.videoBoard,
              emoji: S.videoBoardEmoji,
              kind: "video",
            })
            .select("*")
            .single();
          if (vErr) throw vErr;
          boards.push(video as Board);
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
      const { data: prompts, error: prErr } = await supabase
        .from("boards")
        .insert({
          user_id,
          name: S.promptsBoard,
          emoji: S.promptsBoardEmoji,
          kind: "prompts",
        })
        .select("*")
        .single();
      if (prErr) throw prErr;
      const { data: video, error: vErr } = await supabase
        .from("boards")
        .insert({
          user_id,
          name: S.videoBoard,
          emoji: S.videoBoardEmoji,
          kind: "video",
        })
        .select("*")
        .single();
      if (vErr) throw vErr;
      return [created as Board, people as Board, wardrobe as Board, prompts as Board, video as Board];
    },
    async createBoard(name, emoji, kind: BoardKind = "canvas") {
      const user_id = await workspaceUserId();
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
      return ((data ?? []) as Tag[]).map((tag) => ({
        ...tag,
        category_key: tag.category_key ?? null,
      }));
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
      const user_id = await workspaceUserId();
      const ext = extOf(input.file.name, input.file.type);
      const storage_path = `${user_id}/${input.id}.${ext}`;
      const thumb_path = `${user_id}/thumbs/${input.id}.webp`;
      const up1 = await supabase.storage
        .from(PROMPT_CANVAS_MEDIA_BUCKET)
        .upload(storage_path, input.file, { contentType: input.file.type, upsert: false });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage
        .from(PROMPT_CANVAS_MEDIA_BUCKET)
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
    async upsertTag(name, kind: TagKind = "free", categoryKey: string | null = null) {
      const user_id = await workspaceUserId();
      const trimmed = name.trim();
      let query = supabase
        .from("tags")
        .select("*")
        .eq("user_id", user_id)
        .ilike("name", trimmed);
      if (categoryKey) query = query.eq("category_key", categoryKey);
      else query = query.is("category_key", null);
      const { data: existing } = await query.maybeSingle();
      if (existing) return { ...(existing as Tag), category_key: (existing as Tag).category_key ?? null };
      const { data, error } = await supabase
        .from("tags")
        .insert({
          user_id,
          name: trimmed,
          kind,
          category_key: categoryKey,
          color: "#D9B382",
        })
        .select("*")
        .single();
      if (error) throw error;
      return { ...(data as Tag), category_key: (data as Tag).category_key ?? null };
    },
    async updateTag(id, fields) {
      const patch: { name?: string; kind?: TagKind; category_key?: string | null } = {};
      if (fields.name) patch.name = fields.name.trim();
      if (fields.kind) patch.kind = fields.kind;
      if (fields.category_key !== undefined) patch.category_key = fields.category_key;
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
      const user_id = await workspaceUserId();
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
    async listPromptSheets(boardId) {
      const { data, error } = await supabase
        .from("prompt_sheets")
        .select("*")
        .eq("board_id", boardId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) =>
        hydratePromptSheet(supabase, {
          ...(row as PromptSheet),
          preview_path: (row as PromptSheet).preview_path ?? null,
        }),
      );
    },
    async upsertPromptSheet(input) {
      const user_id = await workspaceUserId();
      const stamp = new Date().toISOString();
      const row = {
        id: input.id,
        user_id,
        board_id: input.board_id,
        title: input.title,
        body: input.body,
        negative_prompt: input.negative_prompt,
        model: input.model,
        notes: input.notes,
        sheet_type: input.sheet_type,
        preview_path: input.preview_path,
        updated_at: input.updated_at ?? stamp,
      };
      const { data, error } = await supabase
        .from("prompt_sheets")
        .upsert(row)
        .select("*")
        .single();
      if (error) throw error;
      return hydratePromptSheet(supabase, data as PromptSheet);
    },
    async setPromptPreview(promptId, file) {
      const user_id = await workspaceUserId();
      const { data: existing, error: findErr } = await supabase
        .from("prompt_sheets")
        .select("*")
        .eq("id", promptId)
        .single();
      if (findErr || !existing) throw findErr ?? new Error("prompt not found");
      const path = promptPreviewPath(user_id, promptId);
      if (!file) {
        if (existing.preview_path) {
          await supabase.storage.from(PROMPT_CANVAS_MEDIA_BUCKET).remove([existing.preview_path]);
        }
        const { data, error } = await supabase
          .from("prompt_sheets")
          .update({ preview_path: null, updated_at: new Date().toISOString() })
          .eq("id", promptId)
          .select("*")
          .single();
        if (error) throw error;
        return hydratePromptSheet(supabase, data as PromptSheet);
      }
      const { blob } = await makeImageThumb(file);
      const { error: upErr } = await supabase.storage
        .from(PROMPT_CANVAS_MEDIA_BUCKET)
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const { data, error } = await supabase
        .from("prompt_sheets")
        .update({ preview_path: path, updated_at: new Date().toISOString() })
        .eq("id", promptId)
        .select("*")
        .single();
      if (error) throw error;
      return hydratePromptSheet(supabase, data as PromptSheet);
    },
    async deletePromptSheet(id) {
      const { error } = await supabase.from("prompt_sheets").delete().eq("id", id);
      if (error) throw error;
    },
    async listCustomTopCategories() {
      const { data, error } = await supabase
        .from("workspace_meta")
        .select("custom_top_categories")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      const rows = data?.custom_top_categories;
      return Array.isArray(rows) ? (rows as { id: string; label: string }[]) : [];
    },
    async saveCustomTopCategories(categories) {
      const { error } = await supabase.from("workspace_meta").upsert({
        id: "default",
        custom_top_categories: categories,
      });
      if (error) throw error;
    },
  };
}
