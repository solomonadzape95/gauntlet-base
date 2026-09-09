alter table public.game_weeks
add column if not exists opening_captured_at timestamptz,
add column if not exists closing_captured_at timestamptz,
add column if not exists last_snapshot_at timestamptz;

alter table public.battles
add column if not exists rematch_of uuid references public.battles(id) on delete set null;

create unique index if not exists game_weeks_one_active_idx on public.game_weeks (status) where status = 'active';
create index if not exists battles_rematch_of_idx on public.battles (rematch_of) where rematch_of is not null;
delete from public.battle_price_snapshots newer
using public.battle_price_snapshots older
where newer.id > older.id
  and newer.battle_id = older.battle_id
  and newer.kind = 'current'
  and older.kind = 'current'
  and date_trunc('minute', newer.captured_at at time zone 'UTC') = date_trunc('minute', older.captured_at at time zone 'UTC');
create unique index if not exists battle_current_snapshot_minute_idx
on public.battle_price_snapshots (battle_id, kind, date_trunc('minute', captured_at at time zone 'UTC'))
where kind = 'current';

create table if not exists public.game_week_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_week_id uuid not null references public.game_weeks(id) on delete cascade,
  kind text not null check (kind in ('opening', 'live', 'closing')),
  prices jsonb not null check (jsonb_typeof(prices) = 'array'),
  bucket_at timestamptz not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (game_week_id, kind, bucket_at)
);

create index if not exists game_week_snapshots_timeline_idx
on public.game_week_price_snapshots (game_week_id, captured_at desc);

alter table public.game_week_price_snapshots enable row level security;
revoke all on public.game_week_price_snapshots from anon, authenticated;
grant all on public.game_week_price_snapshots to service_role;

create or replace function public.activate_game_week_boundary(
  p_game_week_id uuid,
  p_opening_prices jsonb,
  p_captured_at timestamptz,
  p_bucket_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(71112739412699881);
  update public.game_weeks
  set status = 'active',
      opening_prices = p_opening_prices,
      opening_captured_at = p_captured_at,
      last_snapshot_at = p_captured_at
  where id = p_game_week_id
    and status = 'upcoming'
    and starts_at <= p_captured_at
    and not exists (select 1 from public.game_weeks where status = 'active');
  if not found then return false; end if;

  insert into public.game_week_price_snapshots (game_week_id, kind, prices, bucket_at, captured_at)
  values (p_game_week_id, 'opening', p_opening_prices, p_bucket_at, p_captured_at)
  on conflict (game_week_id, kind, bucket_at) do nothing;
  return true;
end;
$$;

create or replace function public.record_game_week_live_snapshot(
  p_game_week_id uuid,
  p_prices jsonb,
  p_captured_at timestamptz,
  p_bucket_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_weeks
  set last_snapshot_at = greatest(coalesce(last_snapshot_at, p_captured_at), p_captured_at)
  where id = p_game_week_id and status = 'active' and ends_at > p_captured_at;
  if not found then return false; end if;

  insert into public.game_week_price_snapshots (game_week_id, kind, prices, bucket_at, captured_at)
  values (p_game_week_id, 'live', p_prices, p_bucket_at, p_captured_at)
  on conflict (game_week_id, kind, bucket_at) do nothing;
  return true;
end;
$$;

create or replace function public.settle_game_week_boundary(
  p_game_week_id uuid,
  p_closing_prices jsonb,
  p_scores jsonb,
  p_captured_at timestamptz,
  p_bucket_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_weeks
  set status = 'complete',
      closing_prices = p_closing_prices,
      closing_captured_at = p_captured_at,
      last_snapshot_at = p_captured_at
  where id = p_game_week_id and status = 'active' and ends_at <= p_captured_at;
  if not found then return false; end if;

  update public.game_week_entries as entry
  set final_return_bps = score.return_bps,
      final_points = score.points
  from jsonb_to_recordset(p_scores) as score(id uuid, return_bps integer, points integer)
  where entry.id = score.id and entry.game_week_id = p_game_week_id;

  insert into public.game_week_price_snapshots (game_week_id, kind, prices, bucket_at, captured_at)
  values (p_game_week_id, 'closing', p_closing_prices, p_bucket_at, p_captured_at)
  on conflict (game_week_id, kind, bucket_at) do nothing;
  return true;
end;
$$;

create or replace function public.game_week_snapshot_timeline(
  p_game_week_id uuid,
  p_limit integer default 240
)
returns table(prices jsonb, captured_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with settings as (
    select greatest(2, least(coalesce(p_limit, 240), 500))::bigint as sample_limit
  ), ordered as (
    select snapshot.prices,
           snapshot.captured_at,
           row_number() over (order by snapshot.captured_at) as row_position,
           count(*) over () as total_count
    from public.game_week_price_snapshots snapshot
    where snapshot.game_week_id = p_game_week_id
  )
  select ordered.prices, ordered.captured_at
  from ordered
  cross join settings
  where ordered.total_count <= settings.sample_limit
     or ordered.row_position = 1
     or ordered.row_position = ordered.total_count
     or mod(
       ordered.row_position - 1,
       greatest(1::bigint, (ordered.total_count + settings.sample_limit - 1) / settings.sample_limit)
     ) = 0
  order by ordered.captured_at;
$$;

revoke execute on function public.activate_game_week_boundary(uuid, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.record_game_week_live_snapshot(uuid, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.settle_game_week_boundary(uuid, jsonb, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.game_week_snapshot_timeline(uuid, integer) from public, anon, authenticated;
grant execute on function public.activate_game_week_boundary(uuid, jsonb, timestamptz, timestamptz) to service_role;
grant execute on function public.record_game_week_live_snapshot(uuid, jsonb, timestamptz, timestamptz) to service_role;
grant execute on function public.settle_game_week_boundary(uuid, jsonb, jsonb, timestamptz, timestamptz) to service_role;
grant execute on function public.game_week_snapshot_timeline(uuid, integer) to service_role;
