import { toast } from "sonner";
import {
  DEFAULT_ASSET_W,
  UPLOAD_CONCURRENCY,
} from "@/lib/constants";
import { enqueueAutoClassify } from "@/lib/auto-classify";
import { isPeopleBoard, isVideoBoard, isWardrobeBoard } from "@/lib/board-kind";
import { inferVideoAttributes } from "@/config/video-attributes";
import { assetRect, findFreePositions, screenToWorld } from "@/lib/canvas-geometry";
import { getRepo } from "@/lib/data/get-repo";
import { hashFile } from "@/lib/hash";
import { S } from "@/lib/strings";
import {
  kindFromMime,
  kindFromName,
  makeImageThumb,
  makeVideoThumb,
  validateFile,
} from "@/lib/thumbnail";
import { useCanvas } from "@/store/canvas-store";
import type { Asset, NewAssetInput } from "@/lib/types";

function worldOriginFromDrop(clientX: number, clientY: number): { x: number; y: number } {
  const el = document.querySelector("[data-canvas-viewport]");
  if (!(el instanceof HTMLElement)) {
    const cam = useCanvas.getState().camera;
    return screenToWorld(cam, 400, 300);
  }
  const rect = el.getBoundingClientRect();
  const cam = useCanvas.getState().camera;
  return screenToWorld(cam, clientX - rect.left, clientY - rect.top);
}

function viewportCenterWorld(): { x: number; y: number } {
  const el = document.querySelector("[data-canvas-viewport]");
  const cam = useCanvas.getState().camera;
  if (!(el instanceof HTMLElement)) return screenToWorld(cam, 400, 300);
  const rect = el.getBoundingClientRect();
  return screenToWorld(cam, rect.width / 2, rect.height / 2);
}

function askDuplicate(): Promise<boolean> {
  return new Promise((resolve) => {
    toast(S.duplicateAsk, {
      duration: 8000,
      action: { label: S.addAnyway, onClick: () => resolve(true) },
      cancel: { label: S.cancel, onClick: () => resolve(false) },
      onDismiss: () => resolve(false),
    });
  });
}

async function prepareFile(file: File): Promise<Omit<NewAssetInput, "x" | "y" | "w" | "z_index" | "id"> | null> {
  const valid = validateFile(file);
  if (!valid.ok) {
    toast.error(valid.error);
    return null;
  }
  const kind = kindFromMime(file.type) ?? kindFromName(file.name);
  if (!kind) {
    toast.error(S.uploadRejectType);
    return null;
  }
  const file_hash = await hashFile(file, file.size);
  const existing = await getRepo().findByHash(file_hash);
  if (existing) {
    const ok = await askDuplicate();
    if (!ok) return null;
  }
  if (kind === "video") {
    const thumb = await makeVideoThumb(file);
    return {
      file,
      thumb: thumb.blob,
      kind,
      width: thumb.width,
      height: thumb.height,
      duration_ms: thumb.duration_ms,
      file_hash,
      title: file.name.replace(/\.[^.]+$/, ""),
    };
  }
  const thumb = await makeImageThumb(file);
  return {
    file,
    thumb: thumb.blob,
    kind,
    width: thumb.width,
    height: thumb.height,
    duration_ms: null,
    file_hash,
    title: file.name.replace(/\.[^.]+$/, ""),
  };
}

export async function ingestFiles(
  files: File[],
  dropAt: { clientX: number; clientY: number } | "center",
): Promise<void> {
  const boardId = useCanvas.getState().boardId;
  if (!boardId || files.length === 0) return;
  const origin =
    dropAt === "center" ? viewportCenterWorld() : worldOriginFromDrop(dropAt.clientX, dropAt.clientY);

  const prepared: NonNullable<Awaited<ReturnType<typeof prepareFile>>>[] = [];
  for (const file of files) {
    const item = await prepareFile(file);
    if (item) prepared.push(item);
  }
  if (prepared.length === 0) return;

  const existingRects = useCanvas.getState().assets.map(assetRect);
  const sizes = prepared.map((p) => ({
    w: DEFAULT_ASSET_W,
    h: DEFAULT_ASSET_W * (p.height / Math.max(p.width, 1)),
  }));
  const spots = findFreePositions(existingRects, sizes, origin.x, origin.y);
  const maxZ = useCanvas.getState().assets.reduce((m, a) => Math.max(m, a.z_index), 0);

  const queue = prepared.map((p, i) => ({
    ...p,
    id: crypto.randomUUID(),
    x: spots[i]?.x ?? origin.x + i * (DEFAULT_ASSET_W + 16),
    y: spots[i]?.y ?? origin.y,
    w: DEFAULT_ASSET_W,
    z_index: maxZ + 1 + i,
  }));

  const uploads = queue.map((q) => ({
    id: q.id,
    name: q.file.name,
    progress: 8,
    error: null as string | null,
  }));
  useCanvas.getState().setUploads(uploads);

  let cursor = 0;
  const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const item = queue[index];
      try {
        useCanvas.getState().setUploads(
          useCanvas.getState().uploads.map((u) =>
            u.id === item.id ? { ...u, progress: 45 } : u,
          ),
        );
        const asset: Asset = await getRepo().insertAsset(item, boardId);
        useCanvas.getState().addAssets([
          {
            ...asset,
            x: item.x,
            y: item.y,
            w: item.w,
            z_index: item.z_index,
            prompt: asset.prompt,
          },
        ]);
        await getRepo().updateAssets([
          {
            id: asset.id,
            fields: { x: item.x, y: item.y, w: item.w, z_index: item.z_index },
          },
        ]);
        useCanvas.getState().setUploads(
          useCanvas.getState().uploads.map((u) =>
            u.id === item.id ? { ...u, progress: 100 } : u,
          ),
        );

        const board = useCanvas.getState().boards.find((b) => b.id === boardId);
        if (asset.kind === "image") {
          if (isPeopleBoard(board)) enqueueAutoClassify(asset.id, "character");
          else if (isWardrobeBoard(board)) enqueueAutoClassify(asset.id, "wardrobe");
        } else if (asset.kind === "video" && isVideoBoard(board)) {
          const inferred = inferVideoAttributes(
            asset.width,
            asset.height,
            asset.duration_ms,
          );
          if (Object.keys(inferred).length > 0) {
            useCanvas.getState().updateFields(asset.id, {
              attributes: { ...asset.attributes, ...inferred },
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "upload failed";
        useCanvas.getState().setUploads(
          useCanvas.getState().uploads.map((u) =>
            u.id === item.id ? { ...u, error: message, progress: 0 } : u,
          ),
        );
      }
    }
  });
  await Promise.all(workers);
  setTimeout(() => {
    useCanvas.getState().setUploads(
      useCanvas.getState().uploads.filter((u) => u.progress < 100 && !u.error),
    );
  }, 900);
}

export async function ingestUrl(url: string, dropAt: { clientX: number; clientY: number } | "center") {
  const res = await fetch("/api/paste-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    toast.error(S.pasteUrlFail);
    return;
  }
  const data = (await res.json()) as {
    filename: string;
    mime: string;
    base64: string;
  };
  const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const file = new File([binary], data.filename, { type: data.mime });
  await ingestFiles([file], dropAt);
}
