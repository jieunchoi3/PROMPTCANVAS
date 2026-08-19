import { ASSET_GAP, GRID, SNAP_THRESHOLD } from "@/lib/constants";
import type { AlignmentGuide, Asset, Camera, Rect } from "@/lib/types";

export function assetHeight(asset: Pick<Asset, "w" | "width" | "height">): number {
  if (!asset.width || !asset.height) return asset.w;
  return asset.w * (asset.height / asset.width);
}

export function assetRect(asset: Pick<Asset, "x" | "y" | "w" | "width" | "height">): Rect {
  return { x: asset.x, y: asset.y, w: asset.w, h: assetHeight(asset) };
}

export function screenToWorld(
  camera: Camera,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return {
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale,
  };
}

export function worldToScreen(
  camera: Camera,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return {
    x: wx * camera.scale + camera.x,
    y: wy * camera.scale + camera.y,
  };
}

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

export function intersectsViewport(
  asset: Pick<Asset, "x" | "y" | "w" | "width" | "height">,
  camera: Camera,
  viewW: number,
  viewH: number,
  pad = 0,
): boolean {
  const r = assetRect(asset);
  const left = (0 - pad - camera.x) / camera.scale;
  const top = (0 - pad - camera.y) / camera.scale;
  const right = (viewW + pad - camera.x) / camera.scale;
  const bottom = (viewH + pad - camera.y) / camera.scale;
  return r.x < right && r.x + r.w > left && r.y < bottom && r.y + r.h > top;
}

export function snap(n: number, grid = GRID): number {
  return Math.round(n / grid) * grid;
}

export function findFreePositions(
  existing: Rect[],
  sizes: { w: number; h: number }[],
  originX: number,
  originY: number,
  rowWidth = 1400,
): { x: number; y: number }[] {
  const placed: Rect[] = existing.map((r) => ({ ...r }));
  const results: { x: number; y: number }[] = [];
  let x = originX;
  let y = originY;
  let rowH = 0;

  for (const size of sizes) {
    let placedOne = false;
    let guard = 0;
    while (guard < 400) {
      guard += 1;
      if (x + size.w > originX + rowWidth && x !== originX) {
        x = originX;
        y += rowH + ASSET_GAP;
        rowH = 0;
      }
      const candidate: Rect = { x, y, w: size.w, h: size.h };
      const hit = placed.some((p) => rectsOverlap(p, candidate, ASSET_GAP));
      if (!hit) {
        placed.push(candidate);
        results.push({ x, y });
        rowH = Math.max(rowH, size.h);
        x += size.w + ASSET_GAP;
        placedOne = true;
        break;
      }
      x += GRID * 4;
      if (x > originX + rowWidth) {
        x = originX;
        y += Math.max(rowH, size.h) + ASSET_GAP;
        rowH = 0;
      }
    }
    if (!placedOne) {
      results.push({ x: originX, y });
      y += size.h + ASSET_GAP;
    }
  }
  return results;
}

export function selectionBounds(
  assets: Pick<Asset, "x" | "y" | "w" | "width" | "height">[],
): Rect | null {
  if (assets.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const a of assets) {
    const r = assetRect(a);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function fitCamera(
  bounds: Rect,
  viewW: number,
  viewH: number,
  padding = 80,
): Camera {
  const scale = Math.min(
    (viewW - padding * 2) / Math.max(bounds.w, 1),
    (viewH - padding * 2) / Math.max(bounds.h, 1),
    2,
  );
  const x = viewW / 2 - (bounds.x + bounds.w / 2) * scale;
  const y = viewH / 2 - (bounds.y + bounds.h / 2) * scale;
  return { x, y, scale };
}

export function computeGuides(
  moving: Rect,
  others: Rect[],
): { x: number; y: number; guides: AlignmentGuide[] } {
  let x = moving.x;
  let y = moving.y;
  const guides: AlignmentGuide[] = [];
  const mx = [
    moving.x,
    moving.x + moving.w / 2,
    moving.x + moving.w,
  ];
  const my = [
    moving.y,
    moving.y + moving.h / 2,
    moving.y + moving.h,
  ];

  let bestX = SNAP_THRESHOLD + 1;
  let bestY = SNAP_THRESHOLD + 1;
  let snapX: number | null = null;
  let snapY: number | null = null;
  let guideX: number | null = null;
  let guideY: number | null = null;

  for (const o of others) {
    const ox = [o.x, o.x + o.w / 2, o.x + o.w];
    const oy = [o.y, o.y + o.h / 2, o.y + o.h];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dx = Math.abs(mx[i] - ox[j]);
        if (dx < bestX) {
          bestX = dx;
          snapX = moving.x + (ox[j] - mx[i]);
          guideX = ox[j];
        }
        const dy = Math.abs(my[i] - oy[j]);
        if (dy < bestY) {
          bestY = dy;
          snapY = moving.y + (oy[j] - my[i]);
          guideY = oy[j];
        }
      }
    }
  }

  if (snapX !== null && bestX <= SNAP_THRESHOLD) {
    x = snapX;
    if (guideX !== null) guides.push({ axis: "x", pos: guideX });
  }
  if (snapY !== null && bestY <= SNAP_THRESHOLD) {
    y = snapY;
    if (guideY !== null) guides.push({ axis: "y", pos: guideY });
  }
  return { x, y, guides };
}

export function clampScale(scale: number): number {
  return Math.min(8, Math.max(0.05, scale));
}
