-- Owner-only editing: everyone can read the owner's library, only the owner can write.

create or replace function prompt_canvas.library_owner()
returns uuid
language sql
immutable
as $$ select 'c7b2de4d-709b-43e7-8790-1269c94a4ccb'::uuid $$;

-- Hand the shared workspace over to the owner account.
update prompt_canvas.boards set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.groups set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.assets set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.tags set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.characters set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.terms set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.smart_collections set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';
update prompt_canvas.prompt_sheets set user_id = prompt_canvas.library_owner() where user_id = '00000000-0000-4000-8000-000000000001';

drop policy if exists pc_open_all on prompt_canvas.boards;
drop policy if exists pc_open_all on prompt_canvas.groups;
drop policy if exists pc_open_all on prompt_canvas.assets;
drop policy if exists pc_open_all on prompt_canvas.tags;
drop policy if exists pc_open_all on prompt_canvas.asset_tags;
drop policy if exists pc_open_all on prompt_canvas.characters;
drop policy if exists pc_open_all on prompt_canvas.character_assets;
drop policy if exists pc_open_all on prompt_canvas.terms;
drop policy if exists pc_open_all on prompt_canvas.analyses;
drop policy if exists pc_open_all on prompt_canvas.smart_collections;
drop policy if exists pc_open_all on prompt_canvas.prompt_sheets;
drop policy if exists pc_meta_open on prompt_canvas.workspace_meta;

-- Tables with a user_id column.
do $$
declare
  t text;
begin
  foreach t in array array['boards', 'groups', 'assets', 'tags', 'characters', 'terms', 'smart_collections', 'prompt_sheets']
  loop
    execute format(
      'create policy pc_public_read on prompt_canvas.%I for select to anon, authenticated using (user_id = prompt_canvas.library_owner())',
      t
    );
    execute format(
      'create policy pc_owner_write on prompt_canvas.%I for all to authenticated
         using (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner())
         with check (user_id = (select auth.uid()) and (select auth.uid()) = prompt_canvas.library_owner())',
      t
    );
  end loop;
end $$;

-- Link tables inherit ownership from their parent row.
create policy pc_public_read on prompt_canvas.asset_tags for select to anon, authenticated
  using (exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = prompt_canvas.library_owner()));
create policy pc_owner_write on prompt_canvas.asset_tags for all to authenticated
  using ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = (select auth.uid())))
  with check ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = (select auth.uid())));

create policy pc_public_read on prompt_canvas.analyses for select to anon, authenticated
  using (exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = prompt_canvas.library_owner()));
create policy pc_owner_write on prompt_canvas.analyses for all to authenticated
  using ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = (select auth.uid())))
  with check ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.assets a where a.id = asset_id and a.user_id = (select auth.uid())));

create policy pc_public_read on prompt_canvas.character_assets for select to anon, authenticated
  using (exists (select 1 from prompt_canvas.characters c where c.id = character_id and c.user_id = prompt_canvas.library_owner()));
create policy pc_owner_write on prompt_canvas.character_assets for all to authenticated
  using ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.characters c where c.id = character_id and c.user_id = (select auth.uid())))
  with check ((select auth.uid()) = prompt_canvas.library_owner()
    and exists (select 1 from prompt_canvas.characters c where c.id = character_id and c.user_id = (select auth.uid())));

create policy pc_public_read on prompt_canvas.workspace_meta for select to anon, authenticated using (true);
create policy pc_owner_write on prompt_canvas.workspace_meta for all to authenticated
  using ((select auth.uid()) = prompt_canvas.library_owner())
  with check ((select auth.uid()) = prompt_canvas.library_owner());

revoke insert, update, delete on all tables in schema prompt_canvas from anon;

-- Media: public read stays; only the owner can upload, replace, or delete.
drop policy if exists pc_media_open_insert on storage.objects;
drop policy if exists pc_media_open_update on storage.objects;
drop policy if exists pc_media_open_delete on storage.objects;

create policy pc_media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prompt-canvas-media' and (select auth.uid()) = prompt_canvas.library_owner());

create policy pc_media_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'prompt-canvas-media' and (select auth.uid()) = prompt_canvas.library_owner())
  with check (bucket_id = 'prompt-canvas-media' and (select auth.uid()) = prompt_canvas.library_owner());

create policy pc_media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'prompt-canvas-media' and (select auth.uid()) = prompt_canvas.library_owner());
