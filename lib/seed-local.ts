import { DEFAULT_ASSET_W } from "@/lib/constants";
import { hashFile } from "@/lib/hash";
import { findFreePositions, assetRect } from "@/lib/canvas-geometry";
import { SEED_ASSETS } from "@/lib/seed-data";
import { STARTER_TAGS } from "@/lib/tag-kinds";
import { makeImageThumb } from "@/lib/thumbnail";
import type { LibraryRepo } from "@/lib/data/repo";

function paintSeed(title: string, w: number, h: number, color: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context missing");
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, color);
  g.addColorStop(1, "#0B0B0D");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(217,179,130,0.92)";
  ctx.font = "600 32px Pretendard, sans-serif";
  ctx.fillText(title, 36, h - 48);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("seed encode failed"));
        return;
      }
      resolve(new File([blob], `${title}.png`, { type: "image/png" }));
    }, "image/png");
  });
}

export async function ensureSeeded(repo: LibraryRepo, boardId: string): Promise<boolean> {
  const existing = await repo.listAssets(boardId);
  if (existing.length > 0) return false;
  const sizes = SEED_ASSETS.map((s) => ({
    w: DEFAULT_ASSET_W,
    h: DEFAULT_ASSET_W * (s.h / s.w),
  }));
  const spots = findFreePositions(
    existing.map(assetRect),
    sizes,
    80,
    80,
  );
  for (let i = 0; i < SEED_ASSETS.length; i++) {
    const spec = SEED_ASSETS[i];
    const file = await paintSeed(spec.title, spec.w, spec.h, spec.color);
    const thumb = await makeImageThumb(file);
    const asset = await repo.insertAsset(
      {
        id: crypto.randomUUID(),
        file,
        thumb: thumb.blob,
        kind: "image",
        width: spec.w,
        height: spec.h,
        duration_ms: null,
        file_hash: await hashFile(file, file.size),
        x: spots[i]?.x ?? 80 + (i % 5) * 260,
        y: spots[i]?.y ?? 80 + Math.floor(i / 5) * 340,
        w: DEFAULT_ASSET_W,
        z_index: i,
        title: spec.title,
      },
      boardId,
    );
    await repo.updateAssets([
      { id: asset.id, fields: { prompt: spec.prompt, model: spec.model } },
    ]);
  }
  await ensureStarterTags(repo);
  return true;
}

export async function ensureStarterTags(repo: LibraryRepo): Promise<void> {
  const existing = await repo.listTags();
  const names = new Set(existing.map((t) => t.name));
  for (const starter of STARTER_TAGS) {
    if (!names.has(starter.name)) {
      await repo.upsertTag(starter.name, starter.kind);
    }
  }
}
