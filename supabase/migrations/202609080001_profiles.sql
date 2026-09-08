create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null unique,
  username text not null,
  avatar_tone text not null default 'hazard' check (avatar_tone in ('hazard', 'base', 'ember', 'ink')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "Players can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
