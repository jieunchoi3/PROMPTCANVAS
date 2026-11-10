"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, LayoutGrid, Plus, Search, Upload } from "lucide-react";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { PROMPT_SHEET_TYPES } from "@/config/prompt-sheet-types";
import { VIDEO_ATTRIBUTES } from "@/config/video-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
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
import { cn } from "@/lib/utils";
import { AccountButton } from "@/components/account-button";
import { AttrTopFilters, TagTopFilters } from "@/components/top-hierarchical-filters";
import { hasAttrFilters } from "@/lib/attributes";
import {
  isPeopleBoard,
  isPromptsBoard,
  isVideoBoard,
  isWardrobeBoard,
  useCanvas,
} from "@/store/canvas-store";

function BoardMoveButton({
  label,
  disabled,
  onMove,
  children,
}: {
  label: string;
  disabled: boolean;
  onMove: () => void;
  children: React.ReactNode;
}) {
  // Swallow pointer events so the surrounding menu item neither selects the board nor closes.
  function stop(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={stop}
      onPointerUp={stop}
      onClick={(e) => {
        stop(e);
        if (!disabled) onMove();
      }}
      className="inline-flex size-5 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-zinc-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const filterCustomTabs = useCanvas((s) => s.filterCustomTabs);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const addCustomTopCategory = useCanvas((s) => s.addCustomTopCategory);
  const filterSheetTypes = useCanvas((s) => s.filterSheetTypes);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const canEdit = useCanvas((s) => s.canEdit);
  const attrFilters = useCanvas((s) => s.attrFilters);
  const createPromptSheet = useCanvas((s) => s.createPromptSheet);
  const current = boards.find((b) => b.id === boardId);
  const peopleBoard = isPeopleBoard(current);
  const wardrobeBoard = isWardrobeBoard(current);
  const videoBoard = isVideoBoard(current);
  const promptsBoard = isPromptsBoard(current);
  const attrCategoryDefs = peopleBoard
    ? CHARACTER_ATTRIBUTES
    : wardrobeBoard
      ? WARDROBE_ATTRIBUTES
      : videoBoard
        ? VIDEO_ATTRIBUTES
        : null;
  const showHierarchicalFilters = !promptsBoard;
  const filtersActive =
    filterKinds.length > 0 ||
    filterCustomTabs.length > 0 ||
    filterSheetTypes.length > 0 ||
    filterTagIds.length > 0 ||
    hasAttrFilters(attrFilters);

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-white/10 bg-[#0B0B0D] px-2 py-1.5 text-[13px]">
      <div className="flex min-h-7 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-zinc-200 hover:bg-white/5">
            <span>{current ? `${current.emoji} ${current.name}` : S.defaultBoard}</span>
            <ChevronDown className="size-3.5 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {boards.map((b, index) => (
              <DropdownMenuItem
                key={b.id}
                className="group/board"
                onClick={() => void useCanvas.getState().setBoard(b.id)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {b.emoji} {b.name}
                </span>
                {canEdit ? (
                <span className="ml-3 flex shrink-0 items-center gap-0.5 opacity-0 group-hover/board:opacity-100 group-focus/board:opacity-100">
                  <BoardMoveButton
                    label={S.boardMoveUp}
                    disabled={index === 0}
                    onMove={() => void useCanvas.getState().moveBoard(b.id, -1)}
                  >
                    <ChevronUp className="size-3.5" />
                  </BoardMoveButton>
                  <BoardMoveButton
                    label={S.boardMoveDown}
                    disabled={index === boards.length - 1}
                    onMove={() => void useCanvas.getState().moveBoard(b.id, 1)}
                  >
                    <ChevronDown className="size-3.5" />
                  </BoardMoveButton>
                </span>
                ) : null}
              </DropdownMenuItem>
            ))}
            {canEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const name = window.prompt(S.boardName, S.defaultBoard);
                    if (name) void useCanvas.getState().createBoard(name, "✦");
                  }}
                >
                  {S.newBoard}
                </DropdownMenuItem>
              </>
            ) : null}
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

        {promptsBoard ? (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PROMPT_SHEET_TYPES.map((type) => {
              const on = filterSheetTypes.includes(type.value);
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => useCanvas.getState().toggleFilterSheetType(type.value)}
                  className={cn(
                    "h-6 shrink-0 rounded-full px-2 text-[12px]",
                    on
                      ? "bg-[#D9B382] text-[#0B0B0D]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10",
                  )}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        {filtersActive ? (
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

        <AccountButton />

        <Link
          href={pathname === "/" || pathname === "/library" ? "/canvas" : "/"}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/5",
            pathname === "/" || pathname === "/library"
              ? "text-[#D9B382]"
              : "text-zinc-400",
          )}
          aria-label={pathname === "/" || pathname === "/library" ? S.canvas : S.library}
        >
          <LayoutGrid className="size-4" />
        </Link>

        {!canEdit ? null : promptsBoard ? (
          <Button
            size="sm"
            className="h-7 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
            onClick={() => {
              const activeType = filterSheetTypes[0];
              void createPromptSheet(activeType);
            }}
          >
            {S.newPrompt}
          </Button>
        ) : (
          <>
            {!attrCategoryDefs ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-[#D9B382]/40 text-[#D9B382] hover:bg-[#D9B382]/10"
                onClick={() => useCanvas.getState().setTermDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                {S.termAdd}
              </Button>
            ) : null}
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
          </>
        )}
      </div>

      {showHierarchicalFilters ? (
        <div className="flex min-w-0 items-start gap-1">
          <div className="min-w-0 flex-1">
            {attrCategoryDefs ? (
              <AttrTopFilters defs={attrCategoryDefs} />
            ) : (
              <TagTopFilters customTopCategories={customTopCategories} />
            )}
          </div>
          {!attrCategoryDefs && canEdit ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={S.addCustomTab}
                title={S.addCustomTab}
                onClick={() => {
                  const label = window.prompt(S.addCustomTabPh);
                  if (label?.trim()) void addCustomTopCategory(label);
                }}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
