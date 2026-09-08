create table if not exists public.wallet_profiles (
  guest_session_hash text primary key,
  wallet_address text not null unique check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  username text not null,
  avatar_tone text not null default 'hazard' check (avatar_tone in ('hazard', 'base', 'ember', 'ink')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists wallet_profiles_username_unique on public.wallet_profiles (lower(username));

create table if not exists public.wallet_profile_sessions (
  session_hash text primary key,
  profile_guest_hash text not null references public.wallet_profiles(guest_session_hash) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.wallet_profiles enable row level security;
alter table public.wallet_profile_sessions enable row level security;
revoke all on public.wallet_profiles, public.wallet_profile_sessions from anon, authenticated;
grant all on public.wallet_profiles, public.wallet_profile_sessions to service_role;
