"use client";

import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

export function UploadQueue() {
  const uploads = useCanvas((s) => s.uploads);
  if (uploads.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 z-20 w-64 space-y-2">
      {uploads.map((u) => (
        <div
          key={u.id}
          className="rounded-md border border-white/10 bg-[#151517]/95 px-3 py-2 text-[12px] shadow-lg"
        >
          <div className="mb-1 truncate text-zinc-300">{u.name}</div>
          {u.error ? (
            <div className="text-red-400">{u.error}</div>
          ) : (
            <>
              <div className="mb-1 text-zinc-500">{S.uploading}</div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#D9B382] transition-all"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
