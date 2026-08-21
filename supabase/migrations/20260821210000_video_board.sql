-- Allow dedicated video / motion-reference boards.
alter table prompt_canvas.boards
  drop constraint if exists boards_kind_check;

alter table prompt_canvas.boards
  add constraint boards_kind_check
  check (kind in ('canvas', 'characters', 'wardrobe', 'prompts', 'video'));
