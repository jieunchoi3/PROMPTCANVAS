alter table public.boards
  add column if not exists kind text not null default 'canvas';

alter table public.assets
  add column if not exists attributes jsonb not null default '{}'::jsonb;

alter table public.boards
  drop constraint if exists boards_kind_check;

alter table public.boards
  add constraint boards_kind_check check (kind in ('canvas', 'characters', 'wardrobe'));
