"use client";

import { useEffect, useId } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { LOCALES, getLocale, setLocale, type Locale } from "@/lib/locale";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";

// Flag emoji render as plain letters on Windows, so the flags are drawn inline.
function UkFlag() {
  const id = useId();
  return (
    <svg viewBox="0 0 60 30" className="h-2.5 w-[18px] shrink-0 rounded-[2px]" aria-hidden>
      <clipPath id={`${id}s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${id}t)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function Trigram({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
      <rect x="-2.2" y="-1.9" width="4.4" height="0.9" />
      <rect x="-2.2" y="-0.45" width="4.4" height="0.9" />
      <rect x="-2.2" y="1" width="4.4" height="0.9" />
    </g>
  );
}

function KoreaFlag() {
  return (
    <svg viewBox="0 0 36 24" className="h-3 w-[18px] shrink-0 rounded-[2px]" aria-hidden>
      <rect width="36" height="24" fill="#fff" />
      <circle cx="18" cy="12" r="6" fill="#0047A0" />
      <path d="M12,12 a6,6 0 0 1 12,0 z" fill="#CD2E3A" />
      <circle cx="15" cy="12" r="3" fill="#CD2E3A" />
      <circle cx="21" cy="12" r="3" fill="#0047A0" />
      <Trigram x={7.5} y={5} angle={-56} />
      <Trigram x={28.5} y={19} angle={-56} />
      <Trigram x={28.5} y={5} angle={56} />
      <Trigram x={7.5} y={19} angle={56} />
    </svg>
  );
}

const FLAGS: Record<Locale, () => React.ReactElement> = { ko: KoreaFlag, en: UkFlag };

export function LanguageSwitch({ className }: { className?: string }) {
  const mounted = useMounted();

  useEffect(() => {
    document.documentElement.lang = getLocale();
  }, []);

  if (!mounted) return null;
  const current = getLocale();

  return (
    <div
      role="group"
      aria-label={S.language}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-white/10 p-0.5",
        className,
      )}
    >
      {LOCALES.map((locale) => {
        const Flag = FLAGS[locale.value];
        const active = locale.value === current;
        return (
          <button
            key={locale.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(locale.value)}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-[5px] px-1.5 text-[11px]",
              active
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-500 opacity-70 hover:bg-white/5 hover:text-zinc-200 hover:opacity-100",
            )}
          >
            <Flag />
            {locale.label}
          </button>
        );
      })}
    </div>
  );
}
