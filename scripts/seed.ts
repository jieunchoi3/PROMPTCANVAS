import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_ASSET_W } from "../lib/constants";
import { SEED_ASSETS } from "../lib/seed-data";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    const t = y / Math.max(height - 1, 1);
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      const mix = x / Math.max(width - 1, 1);
      raw[i] = Math.round(rgb[0] * (1 - t * 0.45) * (1 - mix * 0.15));
      raw[i + 1] = Math.round(rgb[1] * (1 - t * 0.45) * (1 - mix * 0.15));
      raw[i + 2] = Math.round(rgb[2] * (1 - t * 0.45) * (1 - mix * 0.15));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function parseHex(color: string): [number, number, number] {
  const h = color.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function hashBuf(buf: Buffer): string {
  const slice = buf.subarray(0, 1024 * 1024);
  return createHash("sha256")
    .update(slice)
    .update(`:${buf.length}`)
    .digest("hex");
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    console.log(
      "No Supabase credentials. Local mode seeds 20 sample assets on first visit to the canvas.",
    );
    return;
  }
  const supabase = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD ?? "prompt-canvas-seed";
  if (!email) {
    throw new Error("Set SEED_USER_EMAIL in .env.local");
  }
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  let userId = created.data.user?.id;
  if (!userId) {
    const list = await supabase.auth.admin.listUsers();
    userId = list.data.users.find((u) => u.email === email)?.id;
  }
  if (!userId) throw new Error("Could not create or find seed user");

  const { data: existingBoard } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  let boardId = existingBoard?.id as string | undefined;
  if (!boardId) {
    const { data: board, error } = await supabase
      .from("boards")
      .insert({ user_id: userId, name: "캔버스", emoji: "✦" })
      .select("*")
      .single();
    if (error) throw error;
    boardId = board.id as string;
  }

  const { count } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true })
    .eq("board_id", boardId)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    console.log("Board already has assets; skipping.");
    return;
  }

  let x = 80;
  let y = 80;
  let rowH = 0;
  const rowWidth = 1400;
  for (let i = 0; i < SEED_ASSETS.length; i++) {
    const spec = SEED_ASSETS[i];
    const png = makePng(spec.w, spec.h, parseHex(spec.color));
    const id = randomUUID();
    const storage_path = `${userId}/${id}.png`;
    const thumb_path = `${userId}/thumbs/${id}.webp`;
    const up = await supabase.storage.from("media").upload(storage_path, png, {
      contentType: "image/png",
    });
    if (up.error) throw up.error;
    await supabase.storage.from("media").upload(thumb_path, png, {
      contentType: "image/png",
      upsert: true,
    });
    const w = DEFAULT_ASSET_W;
    const h = DEFAULT_ASSET_W * (spec.h / spec.w);
    if (x + w > 80 + rowWidth && x !== 80) {
      x = 80;
      y += rowH + 16;
      rowH = 0;
    }
    const { error } = await supabase.from("assets").insert({
      id,
      user_id: userId,
      board_id: boardId,
      kind: "image",
      storage_path,
      thumb_path,
      width: spec.w,
      height: spec.h,
      x,
      y,
      w,
      z_index: i,
      title: spec.title,
      prompt: spec.prompt,
      model: spec.model,
      file_hash: hashBuf(png),
    });
    if (error) throw error;
    for (const name of spec.tags) {
      const { data: tag } = await supabase
        .from("tags")
        .upsert(
          { user_id: userId, name, kind: "free", color: "#D9B382" },
          { onConflict: "user_id,name" },
        )
        .select("*")
        .single();
      if (tag) {
        await supabase.from("asset_tags").insert({
          asset_id: id,
          tag_id: tag.id,
          source: "user",
        });
      }
    }
    rowH = Math.max(rowH, h);
    x += w + 16;
  }
  console.log(`Seeded ${SEED_ASSETS.length} assets for ${email}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
