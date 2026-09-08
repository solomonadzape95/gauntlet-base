alter table public.drafts
add column if not exists is_active boolean not null default true;

-- Teams created under the retired $100,000 scale must be redrafted. Battle
-- lineups remain immutable JSON snapshots and are intentionally untouched.
update public.drafts as draft
set is_active = false
where is_active
  and coalesce((
    select sum(pick.virtual_amount)
    from public.draft_picks as pick
    where pick.draft_id = draft.id
  ), 0) <> 1000;

with ranked as (
  select id, row_number() over (
    partition by owner_user_id
    order by updated_at desc, created_at desc, id desc
  ) as position
  from public.drafts
  where owner_user_id is not null and is_active
)
update public.drafts
set is_active = false
where id in (select id from ranked where position > 1);

with ranked as (
  select id, row_number() over (
    partition by guest_session_hash
    order by updated_at desc, created_at desc, id desc
  ) as position
  from public.drafts
  where guest_session_hash is not null and is_active
)
update public.drafts
set is_active = false
where id in (select id from ranked where position > 1);

create unique index if not exists drafts_one_active_owner_idx
on public.drafts (owner_user_id)
where owner_user_id is not null and is_active;

create unique index if not exists drafts_one_active_guest_idx
on public.drafts (guest_session_hash)
where guest_session_hash is not null and is_active;

create or replace function public.replace_active_team(
  p_owner_user_id uuid,
  p_guest_session_hash text,
  p_picks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_draft_id uuid;
begin
  if (p_owner_user_id is null) = (p_guest_session_hash is null) then
    raise exception 'Exactly one team owner is required';
  end if;

  update public.drafts
  set is_active = false
  where is_active and (
    (p_owner_user_id is not null and owner_user_id = p_owner_user_id)
    or (p_guest_session_hash is not null and guest_session_hash = p_guest_session_hash)
  );

  insert into public.drafts (owner_user_id, guest_session_hash, status, is_active)
  values (p_owner_user_id, p_guest_session_hash, 'virtual', true)
  returning id into new_draft_id;

  insert into public.draft_picks (draft_id, ticker, virtual_amount, position)
  select new_draft_id, item.value->>'ticker', (item.value->>'virtualAmount')::integer, item.ordinality::smallint
  from jsonb_array_elements(p_picks) with ordinality as item(value, ordinality);

  return new_draft_id;
end;
$$;

revoke execute on function public.replace_active_team(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_active_team(uuid, text, jsonb) to service_role;
