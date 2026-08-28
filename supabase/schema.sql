-- ============================================================================
-- Stock Picks App — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- One row per authenticated user. Mirrors auth.users so we can attach
-- app-specific fields without touching Supabase's own auth table.
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ----------------------------------------------------------------------------
-- scores
-- Global, shared table — the daily pipeline's output. Not user-specific;
-- everyone reads the same computed picks. Written only by the pipeline
-- (via the service role key, which bypasses RLS).
-- ----------------------------------------------------------------------------
create table if not exists scores (
  id bigint generated always as identity primary key,
  run_date date not null,
  ticker text not null,
  company_name text,
  performance_score numeric,
  dividend_yield numeric,
  payout_ratio numeric,
  price_level_score numeric,
  composite_score numeric,
  details jsonb default '{}'::jsonb,
  algorithm_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (run_date, ticker, algorithm_version)
);

create index if not exists scores_run_date_idx on scores (run_date desc);
create index if not exists scores_composite_score_idx on scores (composite_score desc);

alter table scores enable row level security;

-- Everyone (including anonymous visitors) can read scores.
create policy "Scores are publicly readable"
  on scores for select
  using (true);

-- No insert/update/delete policy for regular users — only the service role
-- (used by the pipeline) can write, since it bypasses RLS entirely.


-- ----------------------------------------------------------------------------
-- watchlists + watchlist_items
-- Per-user. A user can have multiple named watchlists, each with tickers.
-- ----------------------------------------------------------------------------
create table if not exists watchlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Watchlist',
  created_at timestamptz not null default now()
);

alter table watchlists enable row level security;

create policy "Users manage their own watchlists"
  on watchlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists watchlist_items (
  id bigint generated always as identity primary key,
  watchlist_id bigint not null references watchlists(id) on delete cascade,
  ticker text not null,
  added_at timestamptz not null default now(),
  unique (watchlist_id, ticker)
);

alter table watchlist_items enable row level security;

-- Access is scoped through the parent watchlist's ownership.
create policy "Users manage items in their own watchlists"
  on watchlist_items for all
  using (
    exists (
      select 1 from watchlists
      where watchlists.id = watchlist_items.watchlist_id
      and watchlists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from watchlists
      where watchlists.id = watchlist_items.watchlist_id
      and watchlists.user_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- notification_preferences
-- Per-user settings for how/when they want to be notified of top picks.
-- ----------------------------------------------------------------------------
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  min_composite_score numeric default 0,
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "Users manage their own notification preferences"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- push_subscriptions
-- Web Push (VAPID) subscription objects, one row per browser/device a user
-- has enabled push on.
-- ----------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- pipeline_runs
-- Log of each daily pipeline execution — useful for debugging and for
-- showing "last updated" info in the UI. Written by the service role.
-- ----------------------------------------------------------------------------
create table if not exists pipeline_runs (
  id bigint generated always as identity primary key,
  run_date date not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  universe_count int,
  dividend_filtered_count int,
  final_picks_count int,
  status text not null default 'running', -- running | completed | failed
  error_message text
);

alter table pipeline_runs enable row level security;

create policy "Pipeline runs are publicly readable"
  on pipeline_runs for select
  using (true);
