export type PromptSheetType = "character" | "location" | "style" | "scene" | "other";

export const PROMPT_SHEET_TYPES: readonly {
  value: PromptSheetType;
  label: string;
}[] = [
  { value: "character", label: "캐릭터 시트" },
  { value: "location", label: "로케이션 시트" },
  { value: "style", label: "스타일" },
  { value: "scene", label: "씬" },
  { value: "other", label: "기타" },
];

export function sheetTypeLabel(value: PromptSheetType | string): string {
  return PROMPT_SHEET_TYPES.find((t) => t.value === value)?.label ?? value;
}
