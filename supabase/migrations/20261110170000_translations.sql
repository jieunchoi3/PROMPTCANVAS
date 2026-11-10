-- Machine translations of the owner's Korean content, shown to English-language viewers.
-- Keyed by an md5 of the source text so long prompts stay within btree index limits.

create table if not exists prompt_canvas.translations (
  source_md5 text generated always as (md5(source)) stored,
  source text not null,
  lang text not null check (lang in ('en')),
  translated text not null,
  user_id uuid not null default prompt_canvas.library_owner(),
  created_at timestamptz not null default now(),
  primary key (source_md5, lang)
);

alter table prompt_canvas.translations enable row level security;

create policy pc_public_read on prompt_canvas.translations for select to anon, authenticated
  using (user_id = prompt_canvas.library_owner());
create policy pc_owner_write on prompt_canvas.translations for all to authenticated
  using (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner())
  with check (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner());

grant select on prompt_canvas.translations to anon, authenticated;
grant insert, update, delete on prompt_canvas.translations to authenticated;
