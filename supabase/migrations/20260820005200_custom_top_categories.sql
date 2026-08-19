alter table prompt_canvas.tags
  add column if not exists category_key text;

create table if not exists prompt_canvas.workspace_meta (
  id text primary key default 'default',
  custom_top_categories jsonb not null default '[]'::jsonb
);

insert into prompt_canvas.workspace_meta (id) values ('default')
on conflict (id) do nothing;

alter table prompt_canvas.workspace_meta enable row level security;

drop policy if exists pc_meta_open on prompt_canvas.workspace_meta;
create policy pc_meta_open on prompt_canvas.workspace_meta
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on prompt_canvas.workspace_meta to anon, authenticated;
