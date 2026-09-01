"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadAsset } from "@/lib/download-asset";
import { S } from "@/lib/strings";
import type { Asset } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function AssetLightbox({ asset }: { asset: Asset | undefined }) {
  const setLightboxId = useCanvas((s) => s.setLightboxId);

  useEffect(() => {
    if (!asset) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [asset, setLightboxId]);

  if (!asset) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/85"
      onClick={() => setLightboxId(null)}
      onKeyDown={() => {}}
      role="presentation"
    >
      <div className="absolute top-4 right-4 z-10">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            void downloadAsset(asset)
              .then(() => toast.success(S.downloaded(1)))
              .catch(() => toast.error(S.downloadFailed));
          }}
        >
          <Download className="size-3.5" />
          {S.download}
        </Button>
      </div>
      {asset.kind === "video" ? (
        <video
          src={asset.url}
          controls
          autoPlay
          className="max-h-[90vh] max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.title ?? ""}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
