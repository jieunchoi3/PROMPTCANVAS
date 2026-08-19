"use client";

import { S } from "@/lib/strings";

export function ModelField({
  value,
  recent,
  onChange,
}: {
  value: string;
  recent: string[];
  onChange: (value: string) => void;
}) {
  const others = recent.filter((m) => m !== value);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={S.modelPlaceholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        name="pc-generation-model"
        data-1p-ignore="true"
        data-lpignore="true"
        className="h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 text-[13px] outline-none focus:border-[#D9B382]/60"
      />
      {others.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {others.slice(0, 8).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className="h-5 rounded-full bg-white/5 px-2 text-[11px] text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
            >
              {m}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
