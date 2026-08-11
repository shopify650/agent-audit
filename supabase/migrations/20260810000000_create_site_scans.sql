-- Site scans for the full-site audit feature.
-- Created via supabase db push (or Supabase SQL editor).
-- The app degrades gracefully if this table is missing.

create table if not exists public.site_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  page_count integer not null default 0,
  overall_score integer not null default 0,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists site_scans_user_created_idx
  on public.site_scans (user_id, created_at desc);

alter table public.site_scans enable row level security;

drop policy if exists "Users can view own site scans" on public.site_scans;
create policy "Users can view own site scans"
  on public.site_scans
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own site scans" on public.site_scans;
create policy "Users can insert own site scans"
  on public.site_scans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own site scans" on public.site_scans;
create policy "Users can delete own site scans"
  on public.site_scans
  for delete
  to authenticated
  using (auth.uid() = user_id);
