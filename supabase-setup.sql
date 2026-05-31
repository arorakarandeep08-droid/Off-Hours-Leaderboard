-- Off Hours leaderboard database setup
-- Paste this whole file into Supabase SQL Editor and click Run.

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
on conflict (id) do nothing;

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
  win_rate integer not null default 0,
  saved_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.app_settings enable row level security;
alter table public.match_history enable row level security;
alter table public.last_week_top3 enable row level security;

-- Simple public policies for the beginner version.
-- The app password hides admin controls, but this is not strong security.
-- For a production version, use Supabase Auth or server-side functions.

drop policy if exists "public read players" on public.players;
drop policy if exists "public insert players" on public.players;
drop policy if exists "public update players" on public.players;
drop policy if exists "public delete players" on public.players;
create policy "public read players" on public.players for select to anon using (true);
create policy "public insert players" on public.players for insert to anon with check (true);
create policy "public update players" on public.players for update to anon using (true) with check (true);
create policy "public delete players" on public.players for delete to anon using (true);

drop policy if exists "public read app_settings" on public.app_settings;
drop policy if exists "public update app_settings" on public.app_settings;
create policy "public read app_settings" on public.app_settings for select to anon using (true);
create policy "public update app_settings" on public.app_settings for update to anon using (true) with check (true);

drop policy if exists "public read match_history" on public.match_history;
drop policy if exists "public insert match_history" on public.match_history;
drop policy if exists "public delete match_history" on public.match_history;
create policy "public read match_history" on public.match_history for select to anon using (true);
create policy "public insert match_history" on public.match_history for insert to anon with check (true);
create policy "public delete match_history" on public.match_history for delete to anon using (true);

drop policy if exists "public read last_week_top3" on public.last_week_top3;
drop policy if exists "public insert last_week_top3" on public.last_week_top3;
drop policy if exists "public delete last_week_top3" on public.last_week_top3;
create policy "public read last_week_top3" on public.last_week_top3 for select to anon using (true);
create policy "public insert last_week_top3" on public.last_week_top3 for insert to anon with check (true);
create policy "public delete last_week_top3" on public.last_week_top3 for delete to anon using (true);
