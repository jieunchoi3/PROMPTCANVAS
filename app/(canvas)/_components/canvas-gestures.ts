"use client";

import { useEffect, type RefObject } from "react";
import {
  assetRect,
  clampScale,
  computeGuides,
  screenToWorld,
  snap,
} from "@/lib/canvas-geometry";
import { GRID, MIN_ASSET_W } from "@/lib/constants";
import { filteredAssets, useCanvas } from "@/store/canvas-store";
import type { Asset } from "@/lib/types";

type Mode = "idle" | "pan" | "marquee" | "move" | "resize";

export function useCanvasGestures(viewportRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let mode: Mode = "idle";
    let pointerId = -1;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let startWorld = { x: 0, y: 0 };
    let movingIds: string[] = [];
    let startPositions: { id: string; x: number; y: number; w: number }[] = [];
    let resizeId: string | null = null;
    let startW = 0;
    let panButton = false;

    const node = el;

    function localPoint(e: PointerEvent | WheelEvent) {
      const rect = node.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const camera = useCanvas.getState().camera;
      if (e.ctrlKey || e.metaKey) {
        const pt = localPoint(e);
        const world = screenToWorld(camera, pt.x, pt.y);
        const factor = Math.exp(-e.deltaY * 0.01);
        const scale = clampScale(camera.scale * factor);
        useCanvas.getState().setCamera({
          scale,
          x: pt.x - world.x * scale,
          y: pt.y - world.y * scale,
        });
        return;
      }
      useCanvas.getState().setCamera({
        ...camera,
        x: camera.x - e.deltaX,
        y: camera.y - e.deltaY,
      });
    }

    function hitAsset(wx: number, wy: number): Asset | undefined {
      const assets = filteredAssets(useCanvas.getState());
      const sorted = [...assets].sort((a, b) => b.z_index - a.z_index);
      return sorted.find((a) => {
        const r = assetRect(a);
        return wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h;
      });
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button === 2) return;
      const pt = localPoint(e);
      lastX = e.clientX;
      lastY = e.clientY;
      startX = pt.x;
      startY = pt.y;
      const camera = useCanvas.getState().camera;
      startWorld = screenToWorld(camera, pt.x, pt.y);
      pointerId = e.pointerId;
      node.setPointerCapture(e.pointerId);

      const space = useCanvas.getState().spaceDown;
      panButton = e.button === 1 || space;
      if (panButton) {
        mode = "pan";
        node.style.cursor = "grabbing";
        return;
      }

      const target = e.target as HTMLElement;
      if (target.dataset.resize === "1") {
        mode = "resize";
        resizeId = target.dataset.assetId ?? null;
        const asset = useCanvas.getState().assets.find((a) => a.id === resizeId);
        startW = asset?.w ?? MIN_ASSET_W;
        if (resizeId && !useCanvas.getState().selectedIds.includes(resizeId)) {
          useCanvas.getState().select([resizeId]);
        }
        return;
      }

      const hit = hitAsset(startWorld.x, startWorld.y);
      if (hit) {
        const selected = useCanvas.getState().selectedIds;
        if (e.shiftKey) {
          useCanvas.getState().select([hit.id], true);
        } else if (!selected.includes(hit.id)) {
          useCanvas.getState().select([hit.id]);
        }
        mode = "move";
        movingIds = e.shiftKey
          ? useCanvas.getState().selectedIds
          : useCanvas.getState().selectedIds.includes(hit.id)
            ? useCanvas.getState().selectedIds
            : [hit.id];
        if (movingIds.length === 0) movingIds = [hit.id];
        startPositions = useCanvas
          .getState()
          .assets.filter((a) => movingIds.includes(a.id))
          .map((a) => ({ id: a.id, x: a.x, y: a.y, w: a.w }));
        const maxZ = useCanvas.getState().assets.reduce((m, a) => Math.max(m, a.z_index), 0);
        useCanvas.getState().moveAssets([], 0, 0);
        useCanvas.setState({
          assets: useCanvas.getState().assets.map((a) =>
            movingIds.includes(a.id) ? { ...a, z_index: maxZ + 1 } : a,
          ),
        });
        return;
      }

      if (!e.shiftKey) useCanvas.getState().clearSelection();
      mode = "marquee";
      useCanvas.getState().setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 });
    }

    function onPointerMove(e: PointerEvent) {
      if (mode === "idle") return;
      const pt = localPoint(e);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const camera = useCanvas.getState().camera;

      if (mode === "pan") {
        useCanvas.getState().setCamera({
          ...camera,
          x: camera.x + dx,
          y: camera.y + dy,
        });
        return;
      }
      if (mode === "marquee") {
        const x = Math.min(startX, pt.x);
        const y = Math.min(startY, pt.y);
        useCanvas.getState().setMarquee({
          x,
          y,
          w: Math.abs(pt.x - startX),
          h: Math.abs(pt.y - startY),
        });
        return;
      }
      if (mode === "resize" && resizeId) {
        const next = Math.max(MIN_ASSET_W, startW + (pt.x - startX) / camera.scale);
        useCanvas.getState().resizeAsset(resizeId, snap(next, GRID));
        return;
      }
      if (mode === "move") {
        const worldDx = dx / camera.scale;
        const worldDy = dy / camera.scale;
        const ids = movingIds;
        const others = useCanvas
          .getState()
          .assets.filter((a) => !ids.includes(a.id))
          .map(assetRect);
        useCanvas.getState().moveAssets(ids, worldDx, worldDy, (asset) => {
          const snapped = { x: snap(asset.x), y: snap(asset.y) };
          const r = assetRect({ ...asset, ...snapped });
          const g = computeGuides(r, others);
          return { x: g.x, y: g.y };
        });
        const primary = useCanvas.getState().assets.find((a) => a.id === ids[0]);
        if (primary) {
          const g = computeGuides(
            assetRect(primary),
            others,
          );
          useCanvas.getState().setGuides(g.guides);
        }
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== pointerId && pointerId !== -1) return;
      if (mode === "marquee") {
        const marquee = useCanvas.getState().marquee;
        if (marquee && (marquee.w > 4 || marquee.h > 4)) {
          const camera = useCanvas.getState().camera;
          const a = screenToWorld(camera, marquee.x, marquee.y);
          const b = screenToWorld(
            camera,
            marquee.x + marquee.w,
            marquee.y + marquee.h,
          );
          const left = Math.min(a.x, b.x);
          const top = Math.min(a.y, b.y);
          const right = Math.max(a.x, b.x);
          const bottom = Math.max(a.y, b.y);
          const hits = filteredAssets(useCanvas.getState())
            .filter((asset) => {
              const r = assetRect(asset);
              return r.x < right && r.x + r.w > left && r.y < bottom && r.y + r.h > top;
            })
            .map((asset) => asset.id);
          useCanvas.getState().select(hits, e.shiftKey);
        }
        useCanvas.getState().setMarquee(null);
      }
      if (mode === "move" && startPositions.length > 0) {
        const after = useCanvas
          .getState()
          .assets.filter((a) => movingIds.includes(a.id))
          .map((a) => ({ id: a.id, x: a.x, y: a.y, w: a.w }));
        const changed = after.some((a) => {
          const b = startPositions.find((s) => s.id === a.id);
          return !b || b.x !== a.x || b.y !== a.y || b.w !== a.w;
        });
        if (changed) {
          useCanvas.getState().commitHistory({
            kind: "move",
            before: startPositions,
            after,
          });
        }
      }
      if (mode === "resize" && resizeId) {
        const asset = useCanvas.getState().assets.find((a) => a.id === resizeId);
        if (asset) {
          useCanvas.getState().commitHistory({
            kind: "move",
            before: [{ id: asset.id, x: asset.x, y: asset.y, w: startW }],
            after: [{ id: asset.id, x: asset.x, y: asset.y, w: asset.w }],
          });
        }
      }
      mode = "idle";
      pointerId = -1;
      movingIds = [];
      resizeId = null;
      useCanvas.getState().setGuides([]);
      node.style.cursor = useCanvas.getState().spaceDown ? "grab" : "default";
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerUp);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerUp);
    };
  }, [viewportRef]);
}
