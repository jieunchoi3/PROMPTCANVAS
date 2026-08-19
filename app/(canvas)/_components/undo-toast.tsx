"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

export function UndoToast() {
  const undoToast = useCanvas((s) => s.undoToast);
  const undo = useCanvas((s) => s.undo);
  const dismissUndoToast = useCanvas((s) => s.dismissUndoToast);
  if (!undoToast) return null;
  const n = undoToast.ids.length;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-md border border-white/10 bg-[#151517]/95 px-3 py-2 text-[13px] shadow-lg">
      <span>{S.deleted(n)}</span>
      <Button
        size="xs"
        variant="outline"
        onClick={() => {
          void undo();
          dismissUndoToast();
          toast(S.moved);
        }}
      >
        {S.undo}
      </Button>
    </div>
  );
}
