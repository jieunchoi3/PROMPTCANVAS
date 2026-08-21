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
    label: "길이",
    multi: false,
    options: [
      { value: "under-15s", label: "15초 이하" },
      { value: "15-60s", label: "15–60초" },
      { value: "1-3min", label: "1–3분" },
      { value: "over-3min", label: "3분+" },
    ],
  },
  {
    key: "aspect",
    label: "비율",
    multi: false,
    options: [
      { value: "9:16", label: "9:16" },
      { value: "16:9", label: "16:9" },
      { value: "1:1", label: "1:1" },
      { value: "4:5", label: "4:5" },
      { value: "other", label: "기타" },
    ],
  },
  {
    key: "motion",
    label: "모션",
    multi: true,
    options: [
      { value: "static", label: "고정" },
      { value: "pan", label: "팬" },
      { value: "zoom", label: "줌" },
      { value: "handheld", label: "핸드헬드" },
      { value: "cut", label: "컷편집" },
      { value: "slow-mo", label: "슬로모" },
    ],
  },
  {
    key: "vibe",
    label: "무드",
    multi: true,
    options: [
      { value: "cinematic", label: "시네마틱" },
      { value: "raw", label: "로우" },
      { value: "dreamy", label: "몽환" },
      { value: "energetic", label: "에너지" },
      { value: "calm", label: "잔잔" },
      { value: "luxury", label: "럭셔리" },
    ],
  },
  {
    key: "use_case",
    label: "용도",
    multi: true,
    options: [
      { value: "reels", label: "릴스/숏폼" },
      { value: "ad", label: "광고" },
      { value: "reference", label: "레퍼런스" },
      { value: "mood", label: "무드보드" },
      { value: "tutorial", label: "튜토리얼" },
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
