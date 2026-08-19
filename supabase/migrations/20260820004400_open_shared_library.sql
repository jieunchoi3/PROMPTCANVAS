-- Open shared library: no login, anon read/write on prompt_canvas workspace

alter table prompt_canvas.boards drop constraint if exists boards_user_id_fkey;
alter table prompt_canvas.groups drop constraint if exists groups_user_id_fkey;
alter table prompt_canvas.assets drop constraint if exists assets_user_id_fkey;
alter table prompt_canvas.tags drop constraint if exists tags_user_id_fkey;
alter table prompt_canvas.characters drop constraint if exists characters_user_id_fkey;
alter table prompt_canvas.terms drop constraint if exists terms_user_id_fkey;
alter table prompt_canvas.smart_collections drop constraint if exists smart_collections_user_id_fkey;
alter table prompt_canvas.prompt_sheets drop constraint if exists prompt_sheets_user_id_fkey;

drop policy if exists boards_own on prompt_canvas.boards;
drop policy if exists groups_own on prompt_canvas.groups;
drop policy if exists assets_own on prompt_canvas.assets;
drop policy if exists tags_own on prompt_canvas.tags;
drop policy if exists asset_tags_own on prompt_canvas.asset_tags;
drop policy if exists characters_own on prompt_canvas.characters;
drop policy if exists character_assets_own on prompt_canvas.character_assets;
drop policy if exists terms_own on prompt_canvas.terms;
drop policy if exists analyses_own on prompt_canvas.analyses;
drop policy if exists smart_collections_own on prompt_canvas.smart_collections;
drop policy if exists prompt_sheets_select_own on prompt_canvas.prompt_sheets;
drop policy if exists prompt_sheets_insert_own on prompt_canvas.prompt_sheets;
drop policy if exists prompt_sheets_update_own on prompt_canvas.prompt_sheets;
drop policy if exists prompt_sheets_delete_own on prompt_canvas.prompt_sheets;

create policy pc_open_all on prompt_canvas.boards for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.groups for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.assets for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.tags for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.asset_tags for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.characters for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.character_assets for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.terms for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.analyses for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.smart_collections for all to anon, authenticated using (true) with check (true);
create policy pc_open_all on prompt_canvas.prompt_sheets for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on all tables in schema prompt_canvas to anon;

drop policy if exists pc_media_select on storage.objects;
drop policy if exists pc_media_insert on storage.objects;
drop policy if exists pc_media_update on storage.objects;
drop policy if exists pc_media_delete on storage.objects;

create policy pc_media_open_read on storage.objects
  for select to public
  using (bucket_id = 'prompt-canvas-media');

create policy pc_media_open_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'prompt-canvas-media');

create policy pc_media_open_update on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'prompt-canvas-media')
  with check (bucket_id = 'prompt-canvas-media');

create policy pc_media_open_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'prompt-canvas-media');
