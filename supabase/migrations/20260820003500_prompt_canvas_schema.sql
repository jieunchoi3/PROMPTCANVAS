-- Prompt Canvas — isolated schema for shared Supabase projects

create schema if not exists prompt_canvas;

create type prompt_canvas.asset_kind as enum ('image', 'video');
create type prompt_canvas.tag_kind as enum (
  'camera',
  'lighting',
  'style',
  'colour',
  'pose',
  'subject',
  'effect',
  'free'
);
create type prompt_canvas.tag_source as enum ('user', 'ai');
create type prompt_canvas.character_asset_role as enum (
  'front',
  'side',
  'back',
  'closeup',
  'expression',
  'outfit',
  'other'
);

create or replace function prompt_canvas.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table prompt_canvas.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '✦',
  kind text not null default 'canvas',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_kind_check check (kind in ('canvas', 'characters', 'wardrobe', 'prompts'))
);

create table prompt_canvas.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references prompt_canvas.boards (id) on delete cascade,
  title text not null default '',
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 0,
  h double precision not null default 0,
  color text not null default '#D9B382',
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table prompt_canvas.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references prompt_canvas.boards (id) on delete cascade,
  kind prompt_canvas.asset_kind not null,
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
  group_id uuid references prompt_canvas.groups (id) on delete set null,
  title text,
  prompt text not null default '',
  negative_prompt text not null default '',
  model text not null default '',
  source_note text not null default '',
  is_character boolean not null default false,
  attributes jsonb not null default '{}'::jsonb,
  file_hash text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table prompt_canvas.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind prompt_canvas.tag_kind not null default 'free',
  color text not null default '#D9B382',
  use_count integer not null default 0,
  unique (user_id, name)
);

create table prompt_canvas.asset_tags (
  asset_id uuid not null references prompt_canvas.assets (id) on delete cascade,
  tag_id uuid not null references prompt_canvas.tags (id) on delete cascade,
  source prompt_canvas.tag_source not null default 'user',
  primary key (asset_id, tag_id)
);

create table prompt_canvas.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  cover_asset_id uuid references prompt_canvas.assets (id) on delete set null,
  base_prompt text not null default '',
  created_at timestamptz not null default now()
);

create table prompt_canvas.character_assets (
  character_id uuid not null references prompt_canvas.characters (id) on delete cascade,
  asset_id uuid not null references prompt_canvas.assets (id) on delete cascade,
  role prompt_canvas.character_asset_role not null default 'other',
  primary key (character_id, asset_id)
);

create table prompt_canvas.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  term_ko text not null default '',
  definition text not null default '',
  kind prompt_canvas.tag_kind not null default 'free',
  example_asset_id uuid references prompt_canvas.assets (id) on delete set null,
  created_at timestamptz not null default now()
);

create table prompt_canvas.analyses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references prompt_canvas.assets (id) on delete cascade,
  model_used text not null,
  created_at timestamptz not null default now(),
  sections jsonb not null default '{}'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  final_prompt text not null default ''
);

create table prompt_canvas.smart_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '📁',
  filter jsonb not null default '{}'::jsonb,
  pinned boolean not null default false
);

create table prompt_canvas.prompt_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  board_id uuid not null references prompt_canvas.boards (id) on delete cascade,
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

create index assets_user_board_idx on prompt_canvas.assets (user_id, board_id) where deleted_at is null;
create index assets_hash_idx on prompt_canvas.assets (user_id, file_hash);
create index assets_group_idx on prompt_canvas.assets (group_id);
create index tags_user_count_idx on prompt_canvas.tags (user_id, use_count desc);
create index asset_tags_tag_idx on prompt_canvas.asset_tags (tag_id);
create index boards_user_idx on prompt_canvas.boards (user_id);
create index groups_board_idx on prompt_canvas.groups (board_id);
create index terms_user_idx on prompt_canvas.terms (user_id);
create index characters_user_idx on prompt_canvas.characters (user_id);
create index smart_collections_user_idx on prompt_canvas.smart_collections (user_id);
create index prompt_sheets_board_id_idx on prompt_canvas.prompt_sheets (board_id);

create trigger boards_set_updated_at
  before update on prompt_canvas.boards
  for each row execute function prompt_canvas.set_updated_at();

create trigger assets_set_updated_at
  before update on prompt_canvas.assets
  for each row execute function prompt_canvas.set_updated_at();

create or replace function prompt_canvas.sync_tag_use_count()
returns trigger
language plpgsql
security invoker
set search_path = prompt_canvas
as $$
begin
  if tg_op = 'INSERT' then
    update prompt_canvas.tags set use_count = use_count + 1 where id = new.tag_id;
    return new;
  elsif tg_op = 'DELETE' then
    update prompt_canvas.tags set use_count = greatest(use_count - 1, 0) where id = old.tag_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger asset_tags_use_count
  after insert or delete on prompt_canvas.asset_tags
  for each row execute function prompt_canvas.sync_tag_use_count();

alter table prompt_canvas.boards enable row level security;
alter table prompt_canvas.groups enable row level security;
alter table prompt_canvas.assets enable row level security;
alter table prompt_canvas.tags enable row level security;
alter table prompt_canvas.asset_tags enable row level security;
alter table prompt_canvas.characters enable row level security;
alter table prompt_canvas.character_assets enable row level security;
alter table prompt_canvas.terms enable row level security;
alter table prompt_canvas.analyses enable row level security;
alter table prompt_canvas.smart_collections enable row level security;
alter table prompt_canvas.prompt_sheets enable row level security;

create policy boards_own on prompt_canvas.boards
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy groups_own on prompt_canvas.groups
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy assets_own on prompt_canvas.assets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tags_own on prompt_canvas.tags
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy asset_tags_own on prompt_canvas.asset_tags
  for all to authenticated
  using (
    exists (
      select 1 from prompt_canvas.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from prompt_canvas.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  );

create policy characters_own on prompt_canvas.characters
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy character_assets_own on prompt_canvas.character_assets
  for all to authenticated
  using (
    exists (
      select 1 from prompt_canvas.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from prompt_canvas.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy terms_own on prompt_canvas.terms
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy analyses_own on prompt_canvas.analyses
  for all to authenticated
  using (
    exists (
      select 1 from prompt_canvas.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from prompt_canvas.assets a
      where a.id = asset_id and a.user_id = auth.uid()
    )
  );

create policy smart_collections_own on prompt_canvas.smart_collections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy prompt_sheets_select_own on prompt_canvas.prompt_sheets
  for select to authenticated
  using (auth.uid() = user_id);

create policy prompt_sheets_insert_own on prompt_canvas.prompt_sheets
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy prompt_sheets_update_own on prompt_canvas.prompt_sheets
  for update to authenticated
  using (auth.uid() = user_id);

create policy prompt_sheets_delete_own on prompt_canvas.prompt_sheets
  for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prompt-canvas-media',
  'prompt-canvas-media',
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

create policy pc_media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prompt-canvas-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy pc_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prompt-canvas-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy pc_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'prompt-canvas-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'prompt-canvas-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy pc_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'prompt-canvas-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

grant usage on schema prompt_canvas to postgres, anon, authenticated, service_role;
grant all on all tables in schema prompt_canvas to postgres, service_role;
grant select, insert, update, delete on all tables in schema prompt_canvas to authenticated;
grant usage, select on all sequences in schema prompt_canvas to authenticated;

alter role authenticator set pgrst.db_schemas to 'public, storage, graphql_public, prompt_canvas';
notify pgrst, 'reload config';
