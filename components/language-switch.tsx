"use client";

import { useEffect } from "react";
import { Languages } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { LOCALES, getLocale, setLocale } from "@/lib/locale";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";

/** Shows the other language's name so it's readable to someone who can't read the current one. */
export function LanguageSwitch({ className }: { className?: string }) {
  const mounted = useMounted();

  useEffect(() => {
    document.documentElement.lang = getLocale();
  }, []);

  if (!mounted) return null;
  const other = LOCALES.find((l) => l.value !== getLocale())!;

  return (
    <button
      type="button"
      title={S.language}
      onClick={() => setLocale(other.value)}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-200",
        className,
      )}
    >
      <Languages className="size-3.5" />
      {other.label}
    </button>
  );
}
