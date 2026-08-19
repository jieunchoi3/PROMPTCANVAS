"use client";

import { useEffect } from "react";
import { TopBar } from "@/app/(canvas)/_components/top-bar";
import { CommandPalette } from "@/app/(canvas)/_components/command-palette";
import { CharacterDialog } from "@/components/character-dialog";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const load = useCanvas((s) => s.load);
  const ready = useCanvas((s) => s.ready);
  const loadError = useCanvas((s) => s.loadError);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-[#0B0B0D] px-6 text-center">
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{S.appName}</p>
          {loadError ? (
            <>
              <p className="text-sm text-red-400">{S.loadError}</p>
              <p className="max-w-sm text-xs text-zinc-600">{loadError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void load()}
              >
                {S.loadRetry}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0B0B0D] text-zinc-200">
      <TopBar />
      <div className="min-h-0 flex-1">{children}</div>
      <CommandPalette />
      <CharacterDialog />
    </div>
  );
}
