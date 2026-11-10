-- User-defined ordering for the board switcher.
alter table prompt_canvas.boards
  add column if not exists position integer;
