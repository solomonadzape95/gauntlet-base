alter table public.game_week_entries
add column if not exists transfer_penalty_points integer not null default 0 check (transfer_penalty_points >= 0);

create table if not exists public.team_transfer_windows (
  id uuid primary key default gen_random_uuid(),
  game_week_id uuid not null references public.game_weeks(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  guest_session_hash text,
  transfers_used integer not null default 0 check (transfers_used >= 0),
  penalty_points integer not null default 0 check (penalty_points >= 0),
  updated_at timestamptz not null default now(),
  constraint team_transfer_window_owner check ((owner_user_id is not null) <> (guest_session_hash is not null))
);

create unique index if not exists team_transfer_window_user_idx on public.team_transfer_windows (game_week_id, owner_user_id) where owner_user_id is not null;
create unique index if not exists team_transfer_window_guest_idx on public.team_transfer_windows (game_week_id, guest_session_hash) where guest_session_hash is not null;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 32),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_guest_hash text,
  created_at timestamptz not null default now(),
  constraint league_owner check ((owner_user_id is not null) <> (owner_guest_hash is not null))
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  guest_session_hash text,
  joined_at timestamptz not null default now(),
  constraint league_member_owner check ((owner_user_id is not null) <> (guest_session_hash is not null))
);

create unique index if not exists league_member_user_idx on public.league_members (league_id, owner_user_id) where owner_user_id is not null;
create unique index if not exists league_member_guest_idx on public.league_members (league_id, guest_session_hash) where guest_session_hash is not null;

alter table public.team_transfer_windows enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
revoke all on public.team_transfer_windows, public.leagues, public.league_members from anon, authenticated;
grant all on public.team_transfer_windows, public.leagues, public.league_members to service_role;

create or replace function public.save_priced_team(
  p_owner_user_id uuid,
  p_guest_session_hash text,
  p_picks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_draft_id uuid;
  new_draft_id uuid;
  next_week_id uuid;
  added_transfers integer := 0;
  used_transfers integer := 0;
  penalty integer := 0;
  team_cost integer;
begin
  if (p_owner_user_id is null) = (p_guest_session_hash is null) then
    raise exception 'Exactly one team owner is required';
  end if;
  if jsonb_typeof(p_picks) <> 'array' or jsonb_array_length(p_picks) not between 3 and 5 then
    raise exception 'A team requires three to five stocks';
  end if;
  select coalesce(sum((item->>'virtualAmount')::integer), 0) into team_cost from jsonb_array_elements(p_picks) item;
  if team_cost <= 0 or team_cost > 1000 then raise exception 'Team exceeds squad budget'; end if;

  select id into old_draft_id from public.drafts
  where is_active and ((p_owner_user_id is not null and owner_user_id = p_owner_user_id) or (p_guest_session_hash is not null and guest_session_hash = p_guest_session_hash))
  order by updated_at desc limit 1 for update;

  if old_draft_id is not null and exists (select 1 from public.game_weeks where status = 'active') then
    raise exception using errcode = 'P0001', message = 'TRANSFER_WINDOW_CLOSED';
  end if;

  if old_draft_id is not null then
    select count(*) into added_transfers
    from jsonb_array_elements(p_picks) item
    where not exists (select 1 from public.draft_picks old_pick where old_pick.draft_id = old_draft_id and old_pick.ticker = item->>'ticker');
  end if;

  select id into next_week_id from public.game_weeks where status = 'upcoming' order by starts_at asc limit 1;
  if next_week_id is not null and added_transfers > 0 then
    if p_owner_user_id is not null then
      insert into public.team_transfer_windows (game_week_id, owner_user_id, guest_session_hash, transfers_used, penalty_points)
      values (next_week_id, p_owner_user_id, null, added_transfers, greatest(0, added_transfers - 1) * 25)
      on conflict (game_week_id, owner_user_id) where owner_user_id is not null
      do update set transfers_used = public.team_transfer_windows.transfers_used + excluded.transfers_used,
        penalty_points = greatest(0, public.team_transfer_windows.transfers_used + excluded.transfers_used - 1) * 25,
        updated_at = now();
    else
      insert into public.team_transfer_windows (game_week_id, owner_user_id, guest_session_hash, transfers_used, penalty_points)
      values (next_week_id, null, p_guest_session_hash, added_transfers, greatest(0, added_transfers - 1) * 25)
      on conflict (game_week_id, guest_session_hash) where guest_session_hash is not null
      do update set transfers_used = public.team_transfer_windows.transfers_used + excluded.transfers_used,
        penalty_points = greatest(0, public.team_transfer_windows.transfers_used + excluded.transfers_used - 1) * 25,
        updated_at = now();
    end if;
  end if;

  update public.drafts set is_active = false where id = old_draft_id;
  insert into public.drafts (owner_user_id, guest_session_hash, status, is_active)
  values (p_owner_user_id, p_guest_session_hash, 'virtual', true) returning id into new_draft_id;
  insert into public.draft_picks (draft_id, ticker, virtual_amount, position)
  select new_draft_id, item.value->>'ticker', (item.value->>'virtualAmount')::integer, item.ordinality::smallint
  from jsonb_array_elements(p_picks) with ordinality item(value, ordinality);

  if next_week_id is not null then
    select coalesce(transfers_used, 0), coalesce(penalty_points, 0) into used_transfers, penalty
    from public.team_transfer_windows
    where game_week_id = next_week_id and ((p_owner_user_id is not null and owner_user_id = p_owner_user_id) or (p_guest_session_hash is not null and guest_session_hash = p_guest_session_hash));
    used_transfers := coalesce(used_transfers, 0);
    penalty := coalesce(penalty, 0);
    update public.game_week_entries set team_id = new_draft_id, lineup = p_picks, transfer_penalty_points = penalty
    where game_week_id = next_week_id and ((p_owner_user_id is not null and owner_user_id = p_owner_user_id) or (p_guest_session_hash is not null and guest_session_hash = p_guest_session_hash));
  end if;

  return jsonb_build_object('id', new_draft_id, 'cost', team_cost, 'bank', 1000 - team_cost, 'transfersUsed', used_transfers, 'penaltyPoints', penalty);
end;
$$;

revoke execute on function public.save_priced_team(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_priced_team(uuid, text, jsonb) to service_role;
