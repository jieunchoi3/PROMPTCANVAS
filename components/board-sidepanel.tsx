"use client";

import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
import { AttributeFilters } from "@/components/attribute-filters";
import { Button } from "@/components/ui/button";
import { optionLabel } from "@/lib/attributes";
import { resolveBoardKind } from "@/lib/board-kind";
import { S } from "@/lib/strings";
import type { Board, Character } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function BoardSidepanel({ board }: { board: Board | undefined }) {
  const attrFilters = useCanvas((s) => s.attrFilters);
  const clearAttrFilters = useCanvas((s) => s.clearAttrFilters);
  const toggleAttrFilter = useCanvas((s) => s.toggleAttrFilter);
  const characters = useCanvas((s) => s.characters);
  const characterAssets = useCanvas((s) => s.characterAssets);
  const selectCharacter = useCanvas((s) => s.selectCharacter);
  const deleteCharacter = useCanvas((s) => s.deleteCharacter);
  const kind = resolveBoardKind(board);
  const defs = kind === "characters" ? CHARACTER_ATTRIBUTES : WARDROBE_ATTRIBUTES;

  if (!board || (kind !== "characters" && kind !== "wardrobe")) {
    return null;
  }

  return (
    <aside className="w-72 shrink-0 border-l border-white/10 bg-[#111113] p-3">
      <div className="mb-3">
        <div className="text-sm text-zinc-200">
          {kind === "characters" ? S.peopleBoard : S.wardrobeBoard}
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
          {kind === "characters" ? S.peopleHint : S.wardrobeHint}
        </p>
      </div>
      <AttributeFilters defs={defs} values={attrFilters} onToggle={toggleAttrFilter} compact />
      <div className="mt-3 flex flex-wrap gap-1">
        {Object.entries(attrFilters).flatMap(([key, values]) =>
          values.map((value) => (
            <span
              key={`${key}-${value}`}
              className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {optionLabel(key, value)}
            </span>
          )),
        )}
      </div>
      <Button variant="ghost" size="xs" className="mt-2" onClick={clearAttrFilters}>
        {S.clearFilters}
      </Button>

      {kind === "characters" ? (
        <div className="mt-5">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            {S.savedCharacters}
          </div>
          <div className="space-y-2">
            {characters.length === 0 ? (
              <div className="text-[12px] text-zinc-500">{S.noCharacters}</div>
            ) : (
              characters.map((character) => (
                <CharacterRow
                  key={character.id}
                  character={character}
                  count={characterAssets.filter((x) => x.character_id === character.id).length}
                  onSelect={() => selectCharacter(character.id)}
                  onDelete={() => void deleteCharacter(character.id)}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function CharacterRow({
  character,
  count,
  onSelect,
  onDelete,
}: {
  character: Character;
  count: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-2">
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="text-[13px] text-zinc-200">{character.name}</div>
        <div className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
          {character.base_prompt || " "}
        </div>
        <div className="mt-1 text-[11px] text-zinc-600">{count} refs</div>
      </button>
      <Button variant="ghost" size="xs" className="mt-1" onClick={onDelete}>
        {S.deleteCharacter}
      </Button>
    </div>
  );
}
