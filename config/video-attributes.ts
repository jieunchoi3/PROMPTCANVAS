import { t } from "@/lib/locale";

export type VideoAttrOption = {
  value: string;
  label: string;
};

export type VideoAttrDef = {
  key: string;
  label: string;
  multi: boolean;
  options: readonly VideoAttrOption[];
};

export const VIDEO_ATTRIBUTES: readonly VideoAttrDef[] = [
  {
    key: "duration_band",
    label: t("길이", "Length"),
    multi: false,
    options: [
      { value: "under-15s", label: t("15초 이하", "Under 15s") },
      { value: "15-60s", label: t("15–60초", "15–60s") },
      { value: "1-3min", label: t("1–3분", "1–3 min") },
      { value: "over-3min", label: t("3분+", "3 min+") },
    ],
  },
  {
    key: "aspect",
    label: t("비율", "Ratio"),
    multi: false,
    options: [
      { value: "9:16", label: "9:16" },
      { value: "16:9", label: "16:9" },
      { value: "1:1", label: "1:1" },
      { value: "4:5", label: "4:5" },
      { value: "other", label: t("기타", "Other") },
    ],
  },
  {
    key: "motion",
    label: t("모션", "Motion"),
    multi: true,
    options: [
      { value: "static", label: t("고정", "Static") },
      { value: "pan", label: t("팬", "Pan") },
      { value: "zoom", label: t("줌", "Zoom") },
      { value: "handheld", label: t("핸드헬드", "Handheld") },
      { value: "cut", label: t("컷편집", "Jump cuts") },
      { value: "slow-mo", label: t("슬로모", "Slow-mo") },
    ],
  },
  {
    key: "vibe",
    label: t("무드", "Mood"),
    multi: true,
    options: [
      { value: "cinematic", label: t("시네마틱", "Cinematic") },
      { value: "raw", label: t("로우", "Raw") },
      { value: "dreamy", label: t("몽환", "Dreamy") },
      { value: "energetic", label: t("에너지", "Energetic") },
      { value: "calm", label: t("잔잔", "Calm") },
      { value: "luxury", label: t("럭셔리", "Luxury") },
    ],
  },
  {
    key: "use_case",
    label: t("용도", "Use"),
    multi: true,
    options: [
      { value: "reels", label: t("릴스/숏폼", "Reels/short-form") },
      { value: "ad", label: t("광고", "Ad") },
      { value: "reference", label: t("레퍼런스", "Reference") },
      { value: "mood", label: t("무드보드", "Moodboard") },
      { value: "tutorial", label: t("튜토리얼", "Tutorial") },
    ],
  },
];

/** Infer duration/aspect attributes from media metadata. */
export function inferVideoAttributes(
  width: number,
  height: number,
  durationMs: number | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (durationMs != null && durationMs > 0) {
    const sec = durationMs / 1000;
    if (sec <= 15) out.duration_band = "under-15s";
    else if (sec <= 60) out.duration_band = "15-60s";
    else if (sec <= 180) out.duration_band = "1-3min";
    else out.duration_band = "over-3min";
  }
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (Math.abs(ratio - 9 / 16) < 0.08) out.aspect = "9:16";
    else if (Math.abs(ratio - 16 / 9) < 0.08) out.aspect = "16:9";
    else if (Math.abs(ratio - 1) < 0.08) out.aspect = "1:1";
    else if (Math.abs(ratio - 4 / 5) < 0.08) out.aspect = "4:5";
    else out.aspect = "other";
  }
  return out;
}
