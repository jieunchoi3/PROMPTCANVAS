"use client";

import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

export function CommandPalette() {
  const open = useCanvas((s) => s.commandOpen);
  const setCommandOpen = useCanvas((s) => s.setCommandOpen);
  const assets = useCanvas((s) => s.assets);
  const tags = useCanvas((s) => s.tags);
  const characters = useCanvas((s) => s.characters);
  const select = useCanvas((s) => s.select);
  const toggleFilterTag = useCanvas((s) => s.toggleFilterTag);
  const selectCharacter = useCanvas((s) => s.selectCharacter);
  const router = useRouter();

  return (
    <CommandDialog
      open={open}
      onOpenChange={setCommandOpen}
      title={S.commandTitle}
      description={S.searchPlaceholder}
    >
      <Command>
        <CommandInput placeholder={S.searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{S.commandEmpty}</CommandEmpty>
          <CommandGroup heading={S.commandActions}>
            <CommandItem
              onSelect={() => {
                router.push("/");
                setCommandOpen(false);
              }}
            >
              {S.canvas}
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/library");
                setCommandOpen(false);
              }}
            >
              {S.library}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={S.commandAssets}>
            {assets.slice(0, 20).map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.title ?? ""} ${a.prompt}`}
                onSelect={() => {
                  select([a.id]);
                  setCommandOpen(false);
                  router.push("/");
                }}
              >
                {a.title || a.id.slice(0, 8)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={S.commandTags}>
            {tags.map((t) => (
              <CommandItem
                key={t.id}
                value={t.name}
                onSelect={() => {
                  toggleFilterTag(t.id);
                  setCommandOpen(false);
                }}
              >
                {t.name}
                <span className="ml-auto text-zinc-500">{t.use_count}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={S.commandCharacters}>
            {characters.map((character) => (
              <CommandItem
                key={character.id}
                value={`${character.name} ${character.base_prompt}`}
                onSelect={() => {
                  selectCharacter(character.id);
                  setCommandOpen(false);
                  router.push("/");
                }}
              >
                {character.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
