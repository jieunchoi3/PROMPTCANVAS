"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { CANVAS_BG } from "@/lib/constants";
import { useCanvas } from "@/store/canvas-store";

export function CanvasViewport({
  viewportRef,
  children,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const camera = useCanvas((s) => s.camera);
  const marquee = useCanvas((s) => s.marquee);
  const guides = useCanvas((s) => s.guides);
  const spaceDown = useCanvas((s) => s.spaceDown);

  const worldStyle: CSSProperties = {
    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
    transformOrigin: "0 0",
  };

  return (
    <div
      ref={viewportRef}
      data-canvas-viewport
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: CANVAS_BG,
        cursor: spaceDown ? "grab" : "default",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
        backgroundSize: `${24 * camera.scale}px ${24 * camera.scale}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
    >
      <div className="absolute left-0 top-0 will-change-transform" style={worldStyle}>
        {children}
        {guides.map((g, i) =>
          g.axis === "x" ? (
            <div
              key={`gx-${i}`}
              className="pointer-events-none absolute top-[-20000px] h-[40000px] w-px bg-[#D9B382]/80"
              style={{ left: g.pos }}
            />
          ) : (
            <div
              key={`gy-${i}`}
              className="pointer-events-none absolute left-[-20000px] h-px w-[40000px] bg-[#D9B382]/80"
              style={{ top: g.pos }}
            />
          ),
        )}
      </div>
      {marquee ? (
        <div
          className="pointer-events-none absolute border border-[#D9B382]/80 bg-[#D9B382]/10"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
          }}
        />
      ) : null}
    </div>
  );
}
