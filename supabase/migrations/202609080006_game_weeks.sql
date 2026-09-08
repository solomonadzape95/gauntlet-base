create table if not exists public.game_weeks (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'complete')),
  entry_lock_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  opening_prices jsonb,
  closing_prices jsonb,
  created_at timestamptz not null default now(),
  constraint game_week_window_valid check (entry_lock_at <= starts_at and ends_at > starts_at),
  constraint active_game_week_has_opening check (status = 'upcoming' or opening_prices is not null),
  constraint complete_game_week_has_closing check (status <> 'complete' or closing_prices is not null)
);

create unique index if not exists game_weeks_label_idx on public.game_weeks (label);

create table if not exists public.game_week_entries (
  id uuid primary key default gen_random_uuid(),
  game_week_id uuid not null references public.game_weeks(id) on delete cascade,
  team_id uuid references public.drafts(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  guest_session_hash text,
  lineup jsonb not null,
  final_return_bps integer,
  final_points integer,
  joined_at timestamptz not null default now(),
  constraint game_week_entry_owner check ((owner_user_id is not null) <> (guest_session_hash is not null))
);

create unique index if not exists game_week_one_user_entry_idx on public.game_week_entries (game_week_id, owner_user_id) where owner_user_id is not null;
create unique index if not exists game_week_one_guest_entry_idx on public.game_week_entries (game_week_id, guest_session_hash) where guest_session_hash is not null;
create index if not exists game_weeks_status_start_idx on public.game_weeks (status, starts_at desc);
create index if not exists game_week_entries_points_idx on public.game_week_entries (game_week_id, final_points desc nulls last);

alter table public.game_weeks enable row level security;
alter table public.game_week_entries enable row level security;
revoke all on public.game_weeks, public.game_week_entries from anon, authenticated;
grant all on public.game_weeks, public.game_week_entries to service_role;

create or replace function public.settle_game_week(
  p_game_week_id uuid,
  p_closing_prices jsonb,
  p_scores jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_weeks
  set status = 'complete', closing_prices = p_closing_prices
  where id = p_game_week_id and status = 'active';
  if not found then return false; end if;

  update public.game_week_entries as entry
  set final_return_bps = score.return_bps,
      final_points = score.points
  from jsonb_to_recordset(p_scores) as score(id uuid, return_bps integer, points integer)
  where entry.id = score.id and entry.game_week_id = p_game_week_id;
  return true;
end;
$$;

revoke execute on function public.settle_game_week(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.settle_game_week(uuid, jsonb, jsonb) to service_role;

insert into public.game_weeks (label, entry_lock_at, starts_at, ends_at)
select
  'GAME WEEK 01',
  date_trunc('week', now() at time zone 'utc') + interval '1 week 14 hours 30 minutes',
  date_trunc('week', now() at time zone 'utc') + interval '1 week 14 hours 30 minutes',
  date_trunc('week', now() at time zone 'utc') + interval '1 week 4 days 21 hours'
where not exists (select 1 from public.game_weeks where status in ('upcoming', 'active'));
