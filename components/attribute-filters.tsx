"use client";

import { cn } from "@/lib/utils";
import type { AttributeMap } from "@/lib/types";

type AttrDef = {
  key: string;
  label: string;
  multi: boolean;
  options: readonly { value: string; label: string }[];
};

export function AttributeFilters({
  defs,
  values,
  onToggle,
  compact = false,
}: {
  defs: readonly AttrDef[];
  values: Record<string, string[]>;
  onToggle: (key: string, value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {defs.map((def) => (
        <div key={def.key}>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
            {def.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {def.options.map((option) => {
              const on = (values[def.key] ?? []).includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(def.key, option.value)}
                  className={cn(
                    compact ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-[12px]",
                    "rounded-full transition-colors",
                    on
                      ? "bg-[#D9B382] text-[#0B0B0D]"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function attrMapToFilterValues(
  map: AttributeMap,
  defs: readonly AttrDef[],
): Record<string, string[]> {
  return Object.fromEntries(
    defs.map((def) => {
      const raw = map[def.key];
      const vals = !raw ? [] : Array.isArray(raw) ? raw : [raw];
      return [def.key, vals];
    }),
  );
}
