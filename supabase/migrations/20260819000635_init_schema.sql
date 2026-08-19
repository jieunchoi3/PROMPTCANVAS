-- Prompt Canvas v2 — full schema (Phase 1 uses a subset; later phases reuse these tables)

create extension if not exists "pgcrypto";

create type public.asset_kind as enum ('image', 'video');
create type public.tag_kind as enum (
  'camera',
  'lighting',
  'style',
  'colour',
  'pose',
  'subject',
  'effect',
  'free'
);
create type public.tag_source as enum ('user', 'ai');
create type public.character_asset_role as enum (
  'front',
  'side',
  'back',
  'closeup',
  'expression',
  'outfit',
  'other'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '✦',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null default '',
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 0,
  h double precision not null default 0,
  color text not null default '#D9B382',
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  thumb_path text,
  width integer not null default 0,
  height integer not null default 0,
  duration_ms integer,
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 240,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  group_id uuid references public.groups (id) on delete set null,
  title text,
  prompt text not null default '',
  negative_prompt text not null default '',
  model text not null default '',
  source_note text not null default '',
  is_character boolean not null default false,
  file_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind public.tag_kind not null default 'free',
  color text not null default '#D9B382',
  use_count integer not null default 0,
  unique (user_id, name)
);

create table public.asset_tags (
  asset_id uuid not null references public.assets (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  source public.tag_source not null default 'user',
  primary key (asset_id, tag_id)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  cover_asset_id uuid references public.assets (id) on delete set null,
  base_prompt text not null default '',
  created_at timestamptz not null default now()
);

create table public.character_assets (
  character_id uuid not null references public.characters (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  role public.character_asset_role not null default 'other',
  primary key (character_id, asset_id)
);

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  term_ko text not null default '',
  definition text not null default '',
  kind public.tag_kind not null default 'free',
  example_asset_id uuid references public.assets (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  model_used text not null,
  created_at timestamptz not null default now(),
  sections jsonb not null default '{}'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  final_prompt text not null default ''
);

create table public.smart_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '📁',
  filter jsonb not null default '{}'::jsonb,
  pinned boolean not null default false
);

create index assets_user_board_idx on public.assets (user_id, board_id) where deleted_at is null;
create index assets_hash_idx on public.assets (user_id, file_hash);
create index assets_group_idx on public.assets (group_id);
create index tags_user_count_idx on public.tags (user_id, use_count desc);
create index asset_tags_tag_idx on public.asset_tags (tag_id);
create index boards_user_idx on public.boards (user_id);
create index groups_board_idx on public.groups (board_id);
create index terms_user_idx on public.terms (user_id);
create index characters_user_idx on public.characters (user_id);
create index smart_collections_user_idx on public.smart_collections (user_id);

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create or replace function public.sync_tag_use_count()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.tags set use_count = use_count + 1 where id = new.tag_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.tags set use_count = greatest(use_count - 1, 0) where id = old.tag_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger asset_tags_use_count
  after insert or delete on public.asset_tags
  for each row execute function public.sync_tag_use_count();

alter table public.boards enable row level security;
alter table public.groups enable row level security;
alter table public.assets enable row level security;
alter table public.tags enable row level security;
alter table public.asset_tags enable row level security;
alter table public.characters enable row level security;
alter table public.character_assets enable row level security;
alter table public.terms enable row level security;
alter table public.analyses enable row level security;
alter table public.smart_collections enable row level security;

create policy boards_own on public.boards
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy groups_own on public.groups
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy assets_own on public.assets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tags_own on public.tags
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy asset_tags_own on public.asset_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  );

create policy characters_own on public.characters
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy character_assets_own on public.character_assets
  for all to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy terms_own on public.terms
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy analyses_own on public.analyses
  for all to authenticated
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  );

create policy smart_collections_own on public.smart_collections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

create policy media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
