"use client";

import { assetHeight } from "@/lib/canvas-geometry";
import { ACCENT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function AssetNode({
  asset,
  selected,
  scale,
}: {
  asset: Asset;
  selected: boolean;
  scale: number;
}) {
  const h = assetHeight(asset);
  const autoplay = useCanvas((s) => s.videoAutoplay);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const tags = useCanvas((s) => s.tags);
  const assetTags = useCanvas((s) => s.assetTags);
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const label = assetTags
    .filter((link) => link.asset_id === asset.id)
    .map((link) => tagById.get(link.tag_id))
    .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined)
    .filter((tag) => filterKinds.length === 0 || filterKinds.includes(tag.kind))
    .map((tag) => tag.name)[0] ?? asset.title ?? "";

  return (
    <div
      data-asset-id={asset.id}
      className={cn(
        "absolute select-none",
        selected ? "z-10" : "z-0",
      )}
      style={{
        left: asset.x,
        top: asset.y,
        width: asset.w,
        height: h,
        transform: `rotate(${asset.rotation}deg)`,
        zIndex: asset.z_index,
      }}
    >
      <div
        className={cn(
          "h-full w-full overflow-hidden bg-zinc-900",
          selected
            ? "ring-2"
            : "hover:ring-1 hover:ring-white/35",
        )}
        style={selected ? { boxShadow: `0 0 0 2px ${ACCENT}` } : undefined}
      >
        {asset.kind === "video" ? (
          <video
            src={asset.url}
            poster={asset.thumbUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="pointer-events-none h-full w-full object-cover"
            autoPlay={autoplay && scale > 0.4}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbUrl || asset.url}
            alt={asset.title ?? ""}
            draggable={false}
            className="pointer-events-none h-full w-full object-cover"
          />
        )}
        {label ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[10px] text-zinc-200">
            <div className="truncate">{label}</div>
          </div>
        ) : null}
      </div>
      {selected ? (
        <button
          type="button"
          data-resize="1"
          data-asset-id={asset.id}
          className="absolute -bottom-1 -right-1 size-2.5 cursor-nwse-resize rounded-[1px] border border-black/40"
          style={{
            background: ACCENT,
            transform: `scale(${Math.max(1, 1 / scale)})`,
            transformOrigin: "bottom right",
          }}
          aria-label="resize"
        />
      ) : null}
    </div>
  );
}
