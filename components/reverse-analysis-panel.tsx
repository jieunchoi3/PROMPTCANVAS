"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import type { ReverseAnalysis } from "@/lib/reverse-analysis-schema";
import { useCanvas } from "@/store/canvas-store";

const SECTION_LABELS: Record<keyof ReverseAnalysis["sections"], string> = {
  subject: "피사체",
  pose_composition: "구도·포즈",
  camera_lens: "카메라·렌즈",
  lighting: "조명",
  colour: "색감",
  style_texture: "스타일·질감",
  background: "배경",
  mood: "무드",
};

export function ReverseAnalysisPanel({
  assetId,
  analysis,
  busy,
  onRun,
}: {
  assetId: string;
  analysis: ReverseAnalysis | null;
  busy: boolean;
  onRun: () => void;
}) {
  const applyAnalysis = useCanvas((s) => s.applyAnalysis);

  if (!analysis) {
    return (
      <Button variant="outline" size="sm" className="h-7" disabled={busy} onClick={onRun}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {S.inspectorReverse}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-2">
      <div className="text-[12px] text-zinc-300">{analysis.summary_ko}</div>
      {Object.entries(analysis.sections).map(([key, value]) => (
        <div key={key}>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
            {SECTION_LABELS[key as keyof ReverseAnalysis["sections"]]}
          </div>
          <div className="text-[11px] leading-relaxed text-zinc-400">{value}</div>
        </div>
      ))}
      {analysis.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {analysis.keywords.map((kw) => (
            <span
              key={`${kw.section}-${kw.term}`}
              className="rounded-full border border-dashed border-[#D9B382]/50 px-2 py-0.5 text-[10px] text-zinc-300"
              title={kw.why}
            >
              {kw.term}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <Button
          size="xs"
          variant="outline"
          className="h-6"
          onClick={() => void applyAnalysis(assetId, { prompt: true, tags: false })}
        >
          {S.applyPrompt}
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="h-6"
          onClick={() => void applyAnalysis(assetId, { prompt: true, tags: true })}
        >
          {S.applyPromptAndTags}
        </Button>
        <Button size="xs" variant="ghost" className="h-6" disabled={busy} onClick={onRun}>
          {S.rerunAnalysis}
        </Button>
      </div>
    </div>
  );
}
