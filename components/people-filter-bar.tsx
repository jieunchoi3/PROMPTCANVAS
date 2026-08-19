"use client";

import { Trash2 } from "lucide-react";
import { CHARACTER_ATTRIBUTES, PRIMARY_ATTR_KEYS } from "@/config/character-attributes";
import { attrValues, optionLabel, hasAttrFilters } from "@/lib/attributes";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/store/canvas-store";

export function PeopleFilterBar() {
  const attrFilters = useCanvas((s) => s.attrFilters);
  const toggleAttrFilter = useCanvas((s) => s.toggleAttrFilter);
  const clearAttrFilters = useCanvas((s) => s.clearAttrFilters);
  const characters = useCanvas((s) => s.characters);
  const selectCharacter = useCanvas((s) => s.selectCharacter);
  const deleteCharacter = useCanvas((s) => s.deleteCharacter);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto border-r border-white/10 bg-[#0D0D0F] px-3 py-3 text-[12px]" style={{ maxWidth: 220 }}>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{S.moreFilters}</div>
      {CHARACTER_ATTRIBUTES.filter((a) =>
        PRIMARY_ATTR_KEYS.includes(a.key as (typeof PRIMARY_ATTR_KEYS)[number]),
      ).map((attr) => (
        <div key={attr.key}>
          <div className="mb-0.5 text-[10px] text-zinc-500">{attr.label}</div>
          <div className="flex flex-wrap gap-1">
            {attr.options.map((opt) => {
              const on = (attrFilters[attr.key] ?? []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleAttrFilter(attr.key, opt.value)}
                  className={cn(
                    "h-6 rounded-full px-2 text-[11px]",
                    on
                      ? "bg-[#D9B382] text-[#0B0B0D]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {hasAttrFilters(attrFilters) ? (
        <button
          type="button"
          className="text-left text-[11px] text-zinc-500 hover:text-zinc-300"
          onClick={clearAttrFilters}
        >
          {S.clearFilters}
        </button>
      ) : null}

      <div className="mt-4 text-[11px] uppercase tracking-wide text-zinc-500">
        {S.savedCharacters}
      </div>
      {characters.length === 0 ? (
        <div className="text-[11px] text-zinc-600">{S.noCharacters}</div>
      ) : (
        <div className="space-y-1">
          {characters.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-zinc-200"
                onClick={() => selectCharacter(c.id)}
              >
                {c.name}
                <span className="ml-1 text-[10px] text-zinc-600">
                  {attrValues(c.attributes, "gender")
                    .map((v) => optionLabel("gender", v))
                    .join(" ")}
                </span>
              </button>
              <button
                type="button"
                className="hidden size-5 text-zinc-500 hover:text-red-400 group-hover:block"
                onClick={() => void deleteCharacter(c.id)}
              >
                <Trash2 className="mx-auto size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
