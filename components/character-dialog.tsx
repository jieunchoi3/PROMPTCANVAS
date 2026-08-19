"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { AttributeFilters, attrMapToFilterValues } from "@/components/attribute-filters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { S } from "@/lib/strings";
import type { AttributeMap } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function CharacterDialog() {
  const open = useCanvas((s) => s.characterDialogOpen);
  const setOpen = useCanvas((s) => s.setCharacterDialogOpen);
  const saveCharacter = useCanvas((s) => s.saveCharacter);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const assets = useCanvas((s) => s.assets);
  const [name, setName] = useState("");
  const [basePrompt, setBasePrompt] = useState("");
  const [attributes, setAttributes] = useState<AttributeMap>({});

  const selectionPrompt = useMemo(
    () =>
      assets
        .filter((a) => selectedIds.includes(a.id))
        .map((a) => a.prompt)
        .find(Boolean) ?? "",
    [assets, selectedIds],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl bg-[#141416]">
        <DialogHeader>
          <DialogTitle>{S.saveCharacter}</DialogTitle>
          <DialogDescription>{S.peopleHint}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={S.characterNamePh}
            className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm"
          />
          <Textarea
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            placeholder={selectionPrompt || S.basePromptPh}
            className="min-h-24 border-white/10 bg-black/40"
          />
          <AttributeFilters
            defs={CHARACTER_ATTRIBUTES}
            values={attrMapToFilterValues(attributes, CHARACTER_ATTRIBUTES)}
            onToggle={(key, value) =>
              setAttributes((prev) => {
                const current = prev[key];
                const vals = !current ? [] : Array.isArray(current) ? current : [current];
                const def = CHARACTER_ATTRIBUTES.find((x) => x.key === key);
                const on = vals.includes(value);
                const nextVals = !def?.multi
                  ? on
                    ? []
                    : [value]
                  : on
                    ? vals.filter((v) => v !== value)
                    : [...vals, value];
                const next = { ...prev };
                if (nextVals.length === 0) delete next[key];
                else next[key] = def?.multi ? nextVals : nextVals[0];
                return next;
              })
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {S.close}
            </Button>
            <Button
              className="bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
              onClick={async () => {
                await saveCharacter({
                  name,
                  attributes,
                  base_prompt: basePrompt || selectionPrompt,
                });
                toast.success(S.characterSaved);
                setName("");
                setBasePrompt("");
                setAttributes({});
              }}
              disabled={!name.trim() || selectedIds.length === 0}
            >
              {S.saveCharacter}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
