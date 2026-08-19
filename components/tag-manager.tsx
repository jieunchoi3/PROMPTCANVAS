"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { S } from "@/lib/strings";
import { TAG_KINDS, groupTags } from "@/lib/tag-kinds";
import type { TagKind } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function TagManager({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tags = useCanvas((s) => s.tags);
  const renameTag = useCanvas((s) => s.renameTag);
  const setTagKind = useCanvas((s) => s.setTagKind);
  const deleteTag = useCanvas((s) => s.deleteTag);
  const createTag = useCanvas((s) => s.createTag);
  const toggleFilterTag = useCanvas((s) => s.toggleFilterTag);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<TagKind>("lighting");

  const grouped = groupTags(tags);

  function addNew() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(S.tagExists);
      return;
    }
    void createTag(trimmed, newKind).then((tag) => {
      if (!tag) toast.error(S.tagExists);
      else setNewName("");
    });
  }

  async function commitRename(id: string) {
    const ok = await renameTag(id, draft);
    if (!ok) toast.error(S.tagExists);
    setEditingId(null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex h-6 items-center rounded-full px-2 text-[12px] text-zinc-500 hover:bg-white/10 hover:text-zinc-300">
        {children}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.tagManage}
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {grouped.map(({ kind, items }) => (
            <div key={kind}>
              {items.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/5"
                >
                  {editingId === tag.id ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => void commitRename(tag.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename(tag.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-6 min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-1.5 text-[12px]"
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[12px] text-zinc-200"
                      onClick={() => {
                        toggleFilterTag(tag.id);
                        setOpen(false);
                      }}
                    >
                      {tag.name}
                      <span className="ml-1 text-zinc-600">{tag.use_count}</span>
                    </button>
                  )}
                  <select
                    value={tag.kind}
                    onChange={(e) =>
                      void setTagKind(tag.id, e.target.value as TagKind)
                    }
                    className="h-6 max-w-[4.5rem] rounded border border-white/10 bg-transparent text-[10px] text-zinc-400"
                    aria-label={S.tagKind}
                  >
                    {TAG_KINDS.map((k) => (
                      <option key={k.key} value={k.key}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="size-6 text-zinc-500 hover:text-zinc-200"
                    onClick={() => {
                      setEditingId(tag.id);
                      setDraft(tag.name);
                    }}
                    aria-label={S.tagRename}
                  >
                    <Pencil className="mx-auto size-3" />
                  </button>
                  <button
                    type="button"
                    className="size-6 text-zinc-500 hover:text-red-400"
                    onClick={() => {
                      if (window.confirm(S.tagDeleteConfirm(tag.name))) {
                        void deleteTag(tag.id);
                      }
                    }}
                    aria-label={S.tagDelete}
                  >
                    <Trash2 className="mx-auto size-3" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1 border-t border-white/10 pt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={S.tagPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                addNew();
              }
            }}
            className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[12px]"
          />
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as TagKind)}
            className="h-7 rounded-md border border-white/10 bg-black/40 px-1 text-[11px] text-zinc-300"
          >
            {TAG_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <Button
            size="xs"
            className="h-7 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
            disabled={!newName.trim()}
            onClick={addNew}
          >
            {S.tagCreate}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
