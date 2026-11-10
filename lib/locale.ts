export type Locale = "ko" | "en";

export const LOCALES: readonly { value: Locale; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
];

const LOCALE_KEY = "pc.locale";

function detectLocale(): Locale {
  // The server always renders Korean; client-only text must wait for mount (see useMounted).
  if (typeof window === "undefined") return "ko";
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === "ko" || stored === "en") return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the browser language.
  }
  return window.navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

const current: Locale = detectLocale();

export function getLocale(): Locale {
  return current;
}

/** Picks the string for the active language. */
export function t(ko: string, en: string): string {
  return current === "en" ? en : ko;
}

export function setLocale(locale: Locale) {
  if (locale === current) return;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    return;
  }
  window.location.reload();
}
