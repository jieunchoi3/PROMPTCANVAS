-- A bare alias inside to_jsonb() resolves to a same-named column of a joined table first
-- (assets.x), so every row source is referenced as alias.* instead.

create or replace function prompt_canvas.library_snapshot(p_owner uuid, p_board uuid default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_board uuid;
begin
  select b.id into v_board from prompt_canvas.boards b where b.user_id = p_owner and b.id = p_board;
  if v_board is null then
    select b.id into v_board from prompt_canvas.boards b
    where b.user_id = p_owner and b.kind = 'characters'
    order by b.created_at limit 1;
  end if;
  if v_board is null then
    select b.id into v_board from prompt_canvas.boards b
    where b.user_id = p_owner
    order by b.position nulls last, b.created_at limit 1;
  end if;

  return jsonb_build_object(
    'board_id', v_board,
    'boards', coalesce((
      select jsonb_agg(to_jsonb(b.*) order by b.created_at)
      from prompt_canvas.boards b where b.user_id = p_owner
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(to_jsonb(a.*))
      from prompt_canvas.assets a
      where a.user_id = p_owner and a.board_id = v_board and a.deleted_at is null
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(to_jsonb(t.*) order by t.use_count desc)
      from prompt_canvas.tags t where t.user_id = p_owner
    ), '[]'::jsonb),
    'asset_tags', coalesce((
      select jsonb_agg(to_jsonb(link.*))
      from prompt_canvas.asset_tags link
      join prompt_canvas.assets a on a.id = link.asset_id
      where a.user_id = p_owner
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(distinct a.model)
      from prompt_canvas.assets a
      where a.user_id = p_owner and a.deleted_at is null and a.model <> ''
    ), '[]'::jsonb),
    'characters', coalesce((
      select jsonb_agg(to_jsonb(c.*))
      from prompt_canvas.characters c where c.user_id = p_owner
    ), '[]'::jsonb),
    'character_assets', coalesce((
      select jsonb_agg(to_jsonb(ca.*))
      from prompt_canvas.character_assets ca
      join prompt_canvas.characters c on c.id = ca.character_id
      where c.user_id = p_owner
    ), '[]'::jsonb),
    'prompt_sheets', coalesce((
      select jsonb_agg(to_jsonb(p.*) order by p.updated_at desc)
      from prompt_canvas.prompt_sheets p
      where p.user_id = p_owner and p.board_id = v_board
    ), '[]'::jsonb),
    'custom_top_categories', coalesce((
      select m.custom_top_categories from prompt_canvas.workspace_meta m where m.id = 'default'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function prompt_canvas.library_snapshot(uuid, uuid) to anon, authenticated;
