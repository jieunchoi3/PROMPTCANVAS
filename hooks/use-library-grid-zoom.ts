"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "pc.libraryCellSize";
export const GRID_CELL_DEFAULT = 180;
export const GRID_CELL_MIN = 72;
export const GRID_CELL_MAX = 360;

function clampCell(size: number): number {
  return Math.min(GRID_CELL_MAX, Math.max(GRID_CELL_MIN, Math.round(size)));
}

function readStoredCellSize(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return GRID_CELL_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) ? clampCell(n) : GRID_CELL_DEFAULT;
  } catch {
    return GRID_CELL_DEFAULT;
  }
}

/** Pinch / ctrl+wheel zoom for library grid density (smaller cell = more per row). */
export function useLibraryGridZoom() {
  const [cellSize, setCellSize] = useState(GRID_CELL_DEFAULT);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const cellSizeRef = useRef(cellSize);

  useEffect(() => {
    const stored = readStoredCellSize();
    setCellSize(stored);
    cellSizeRef.current = stored;
  }, []);

  const setAndStore = useCallback((next: number) => {
    const clamped = clampCell(next);
    cellSizeRef.current = clamped;
    setCellSize(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!node) return;

    function onWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setAndStore(cellSizeRef.current * factor);
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [node, setAndStore]);

  return { cellSize, containerRef, setCellSize: setAndStore };
}
