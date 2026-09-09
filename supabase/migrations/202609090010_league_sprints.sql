create table if not exists public.league_sprints (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'complete')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  opening_prices jsonb not null check (jsonb_typeof(opening_prices) = 'array'),
  closing_prices jsonb,
  created_at timestamptz not null default now(),
  constraint league_sprint_window_valid check (ends_at > starts_at),
  constraint complete_league_sprint_has_closing check (status <> 'complete' or closing_prices is not null)
);

create table if not exists public.league_sprint_entries (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.league_sprints(id) on delete cascade,
  team_id uuid references public.drafts(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  guest_session_hash text,
  lineup jsonb not null check (jsonb_typeof(lineup) = 'array'),
  final_points integer,
  created_at timestamptz not null default now(),
  constraint league_sprint_entry_owner check ((owner_user_id is not null) <> (guest_session_hash is not null))
);

create unique index if not exists league_sprints_one_active_idx
on public.league_sprints (league_id) where status = 'active';
create index if not exists league_sprints_recent_idx
on public.league_sprints (league_id, starts_at desc);
create unique index if not exists league_sprint_entry_user_idx
on public.league_sprint_entries (sprint_id, owner_user_id) where owner_user_id is not null;
create unique index if not exists league_sprint_entry_guest_idx
on public.league_sprint_entries (sprint_id, guest_session_hash) where guest_session_hash is not null;

alter table public.league_sprints enable row level security;
alter table public.league_sprint_entries enable row level security;
revoke all on public.league_sprints, public.league_sprint_entries from anon, authenticated;
grant all on public.league_sprints, public.league_sprint_entries to service_role;
