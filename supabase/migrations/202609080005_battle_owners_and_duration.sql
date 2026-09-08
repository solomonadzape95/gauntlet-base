alter table public.battles
add column if not exists duration_minutes integer not null default 1440
  check (duration_minutes in (60, 1440)),
add column if not exists creator_team_id uuid references public.drafts(id) on delete set null,
add column if not exists creator_user_id uuid references auth.users(id) on delete set null,
add column if not exists creator_guest_hash text,
add column if not exists opponent_team_id uuid references public.drafts(id) on delete set null,
add column if not exists opponent_user_id uuid references auth.users(id) on delete set null,
add column if not exists opponent_guest_hash text;

create index if not exists battles_creator_user_idx on public.battles (creator_user_id, created_at desc);
create index if not exists battles_creator_guest_idx on public.battles (creator_guest_hash, created_at desc);
create index if not exists battles_opponent_user_idx on public.battles (opponent_user_id, created_at desc);
create index if not exists battles_opponent_guest_idx on public.battles (opponent_guest_hash, created_at desc);
