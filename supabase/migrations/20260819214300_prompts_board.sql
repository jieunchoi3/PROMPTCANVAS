alter table public.boards
  drop constraint if exists boards_kind_check;

alter table public.boards
  add constraint boards_kind_check check (kind in ('canvas', 'characters', 'wardrobe', 'prompts'));

create table if not exists public.prompt_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  negative_prompt text not null default '',
  model text not null default '',
  notes text not null default '',
  sheet_type text not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompt_sheets_sheet_type_check check (
    sheet_type in ('character', 'location', 'style', 'scene', 'other')
  )
);

create index if not exists prompt_sheets_board_id_idx on public.prompt_sheets (board_id);

alter table public.prompt_sheets enable row level security;

create policy "prompt_sheets_select_own"
  on public.prompt_sheets for select
  using (auth.uid() = user_id);

create policy "prompt_sheets_insert_own"
  on public.prompt_sheets for insert
  with check (auth.uid() = user_id);

create policy "prompt_sheets_update_own"
  on public.prompt_sheets for update
  using (auth.uid() = user_id);

create policy "prompt_sheets_delete_own"
  on public.prompt_sheets for delete
  using (auth.uid() = user_id);
