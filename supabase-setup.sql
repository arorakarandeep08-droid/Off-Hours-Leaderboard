-- Off Hours leaderboard database setup
-- Paste this whole file into Supabase SQL Editor and click Run.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  played integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  win_points integer not null default 3,
  loss_points integer not null default -1,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, win_points, loss_points)
values (1, 3, -1)
on conflict (id) do update set loss_points = -1 where public.app_settings.loss_points >= 0;

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid,
  loser_id uuid,
  winner_name text,
  loser_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.last_week_top3 (
  id uuid primary key default gen_random_uuid(),
  rank integer not null,
  name text not null,
  played integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.app_settings enable row level security;
alter table public.match_history enable row level security;
alter table public.last_week_top3 enable row level security;

drop policy if exists "public read players" on public.players;
drop policy if exists "public write players" on public.players;
drop policy if exists "public read settings" on public.app_settings;
drop policy if exists "public write settings" on public.app_settings;
drop policy if exists "public read match history" on public.match_history;
drop policy if exists "public write match history" on public.match_history;
drop policy if exists "public read top3" on public.last_week_top3;
drop policy if exists "public write top3" on public.last_week_top3;

create policy "public read players" on public.players for select using (true);
create policy "public write players" on public.players for all using (true) with check (true);
create policy "public read settings" on public.app_settings for select using (true);
create policy "public write settings" on public.app_settings for all using (true) with check (true);
create policy "public read match history" on public.match_history for select using (true);
create policy "public write match history" on public.match_history for all using (true) with check (true);
create policy "public read top3" on public.last_week_top3 for select using (true);
create policy "public write top3" on public.last_week_top3 for all using (true) with check (true);
