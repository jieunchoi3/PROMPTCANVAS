import { useCallback } from "react";
import { translateText } from "@/lib/auto-translate";
import { useCanvas } from "@/store/canvas-store";

/** Translates owner-written Korean text when the UI is in English. */
export function useTr(): (text: string) => string {
  const translations = useCanvas((s) => s.translations);
  return useCallback((text: string) => translateText(translations, text), [translations]);
}
