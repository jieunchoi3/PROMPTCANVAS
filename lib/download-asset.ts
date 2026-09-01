import { extOf } from "@/lib/env";
import type { Asset } from "@/lib/types";

function downloadName(asset: Asset, mime: string): string {
  const base = asset.title?.trim() || `asset-${asset.id.slice(0, 8)}`;
  const safe = base.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  const ext = extOf(safe, mime);
  if (safe.toLowerCase().endsWith(`.${ext}`)) return safe;
  return `${safe}.${ext}`;
}

export async function downloadAsset(asset: Asset): Promise<void> {
  const res = await fetch(asset.url);
  if (!res.ok) throw new Error("download_failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName(asset, blob.type || "image/jpeg");
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadAssets(assets: Asset[]): Promise<number> {
  let ok = 0;
  for (const asset of assets) {
    try {
      await downloadAsset(asset);
      ok += 1;
      await new Promise((r) => setTimeout(r, 180));
    } catch {
      /* continue with remaining */
    }
  }
  return ok;
}
