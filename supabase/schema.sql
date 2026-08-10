-- Replog — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE).

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_dumbbell boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text,                       -- optional, e.g. "Push Day"
  workout_date date not null default current_date,
  notes        text,                       -- optional session-level context
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.sets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references public.sessions(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id) on delete cascade,
  set_index     int  not null default 1,
  reps          int  not null default 0,
  weight_kg     numeric(7,2) not null default 0,
  rest_sec      int,
  superset_group int,                      -- null = standalone; same int within session = superset
  created_at    timestamptz not null default now()
);

-- Helpful indexes for the comparison/history views
create index if not exists idx_sets_session on public.sets(session_id);
create index if not exists idx_sets_exercise on public.sets(exercise_id);
create index if not exists idx_sets_user_exercise_date
  on public.sets(user_id, exercise_id, created_at);
create index if not exists idx_sessions_user_date
  on public.sessions(user_id, workout_date desc);
create index if not exists idx_exercises_user on public.exercises(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.sets      enable row level security;

-- Drop & recreate policies so re-running is clean.
drop policy if exists "exercises own select" on public.exercises;
drop policy if exists "exercises own insert" on public.exercises;
drop policy if exists "exercises own update" on public.exercises;
drop policy if exists "exercises own delete" on public.exercises;

create policy "exercises own select" on public.exercises
  for select using (auth.uid() = user_id);
create policy "exercises own insert" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises own update" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises own delete" on public.exercises
  for delete using (auth.uid() = user_id);

drop policy if exists "sessions own select" on public.sessions;
drop policy if exists "sessions own insert" on public.sessions;
drop policy if exists "sessions own update" on public.sessions;
drop policy if exists "sessions own delete" on public.sessions;

create policy "sessions own select" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions own insert" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions own update" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions own delete" on public.sessions
  for delete using (auth.uid() = user_id);

drop policy if exists "sets own select" on public.sets;
drop policy if exists "sets own insert" on public.sets;
drop policy if exists "sets own update" on public.sets;
drop policy if exists "sets own delete" on public.sets;

create policy "sets own select" on public.sets
  for select using (auth.uid() = user_id);
create policy "sets own insert" on public.sets
  for insert with check (auth.uid() = user_id);
create policy "sets own update" on public.sets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sets own delete" on public.sets
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- Realtime (optional — enables live sync between phone & PC mid-session)
-- ============================================================================
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.sets;
alter publication supabase_realtime add table public.exercises;