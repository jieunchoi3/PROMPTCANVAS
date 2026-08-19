"use client";

import { useEffect } from "react";
import { TopBar } from "@/app/(canvas)/_components/top-bar";
import { CommandPalette } from "@/app/(canvas)/_components/command-palette";
import { CharacterDialog } from "@/components/character-dialog";
import { useCanvas } from "@/store/canvas-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const load = useCanvas((s) => s.load);
  const ready = useCanvas((s) => s.ready);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-[#0B0B0D] text-sm text-zinc-500">
        Prompt Canvas
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
