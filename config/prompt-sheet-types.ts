import { t } from "@/lib/locale";

export type PromptSheetType = "character" | "location" | "style" | "scene" | "other";

export const PROMPT_SHEET_TYPES: readonly {
  value: PromptSheetType;
  label: string;
}[] = [
  { value: "character", label: t("캐릭터 시트", "Character sheet") },
  { value: "location", label: t("로케이션 시트", "Location sheet") },
  { value: "style", label: t("스타일", "Style") },
  { value: "scene", label: t("씬", "Scene") },
  { value: "other", label: t("기타", "Other") },
];

export function sheetTypeLabel(value: PromptSheetType | string): string {
  return PROMPT_SHEET_TYPES.find((t) => t.value === value)?.label ?? value;
}
