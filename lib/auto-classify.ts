import { toast } from "sonner";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

type ClassifyKind = "character" | "wardrobe";

type Job = {
  assetId: string;
  kind: ClassifyKind;
};

const CONCURRENCY = 1;
const queue: Job[] = [];
let active = 0;
let okCount = 0;
let failCount = 0;
let summaryTimer: ReturnType<typeof setTimeout> | null = null;

export function enqueueAutoClassify(assetId: string, kind: ClassifyKind) {
  queue.push({ assetId, kind });
  void pump();
}

async function pump() {
  while (active < CONCURRENCY && queue.length > 0) {
    const job = queue.shift();
    if (!job) return;
    active += 1;
    try {
      if (job.kind === "character") {
        await useCanvas.getState().analyzeCharacterAsset(job.assetId, { silent: true });
      } else {
        await useCanvas.getState().analyzeWardrobeAsset(job.assetId, { silent: true });
      }
      okCount += 1;
    } catch {
      failCount += 1;
    } finally {
      active -= 1;
      scheduleSummary();
      void pump();
    }
  }
}

function scheduleSummary() {
  if (summaryTimer) clearTimeout(summaryTimer);
  summaryTimer = setTimeout(() => {
    if (active > 0 || queue.length > 0) return;
    const ok = okCount;
    const fail = failCount;
    okCount = 0;
    failCount = 0;
    if (ok === 0 && fail === 0) return;
    if (fail === 0) toast.success(S.autoClassified(ok));
    else if (ok === 0) toast.error(S.autoClassifyAllFailed(fail));
    else toast.message(S.autoClassifyPartial(ok, fail));
  }, 700);
}
