"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCEPT_ATTR } from "@/lib/constants";
import { ingestFiles } from "@/lib/ingest";
import { S } from "@/lib/strings";
import { TOP_CATEGORY_KINDS, kindLabel } from "@/lib/tag-kinds";
import { cn } from "@/lib/utils";
import { TagManager } from "@/components/tag-manager";
import { useCanvas } from "@/store/canvas-store";

export function TopBar() {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const mode = useCanvas((s) => s.mode);
  const attrFilters = useCanvas((s) => s.attrFilters);
  const current = boards.find((b) => b.id === boardId);

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0B0B0D] px-2 text-[13px]">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-zinc-200 hover:bg-white/5">
          <span>{current ? `${current.emoji} ${current.name}` : S.defaultBoard}</span>
          <ChevronDown className="size-3.5 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {boards.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => void useCanvas.getState().setBoard(b.id)}
            >
              {b.emoji} {b.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              const name = window.prompt(S.boardName, S.defaultBoard);
              if (name) void useCanvas.getState().createBoard(name, "✦");
            }}
          >
            {S.newBoard}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => useCanvas.getState().setCommandOpen(true)}
        className="flex h-7 min-w-44 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 text-zinc-500 hover:text-zinc-300"
      >
        <Search className="size-3.5" />
        <span>{S.searchPlaceholder}</span>
        <kbd className="ml-auto text-[10px] text-zinc-600">⌘K</kbd>
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {TOP_CATEGORY_KINDS.map((kind) => {
          const on = filterKinds.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => useCanvas.getState().toggleFilterKind(kind)}
              className={cn(
                "h-6 shrink-0 rounded-full px-2 text-[12px]",
                on
                  ? "bg-[#D9B382] text-[#0B0B0D]"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
            >
              {kindLabel(kind)}
            </button>
          );
        })}
        <TagManager>{S.tagManage}</TagManager>
        {(filterKinds.length > 0 ||
          filterTagIds.length > 0 ||
          Object.values(attrFilters).some((v) => v.length > 0)) ? (
          <button
            type="button"
            onClick={() => {
              useCanvas.getState().clearFilters();
              useCanvas.getState().clearAttrFilters();
            }}
            className="h-6 shrink-0 px-1 text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            {S.clearFilters}
          </button>
        ) : null}
      </div>

      <span className="hidden text-[11px] text-zinc-600 sm:inline">
        {mode === "local" ? S.localMode : S.cloudMode}
      </span>

      <Link
        href={pathname === "/library" ? "/" : "/library"}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md hover:bg-white/5",
          pathname === "/library" ? "text-[#D9B382]" : "text-zinc-400",
        )}
        aria-label={pathname === "/library" ? S.canvas : S.library}
      >
        <LayoutGrid className="size-4" />
      </Link>

      <Button
        size="sm"
        className="h-7 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-3.5" />
        {S.upload}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) void ingestFiles(files, "center");
        }}
      />
    </header>
  );
}
