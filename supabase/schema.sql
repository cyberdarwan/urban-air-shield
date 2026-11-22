-- SmogSense Phase 3: Care Spaces Cloud Sync Schema & Row-Level Security
-- Run this in your Supabase Dashboard -> SQL Editor

create table if not exists public.care_spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  city text not null,
  safe_aqi_limit integer not null default 100,
  profile jsonb not null default '{}'::jsonb,
  notify_enabled boolean not null default false,
  last_alert_status text,
  updated_at timestamptz not null default now()
);

create index if not exists care_spaces_user_id_idx
  on public.care_spaces (user_id);

alter table public.care_spaces enable row level security;

-- Strict Row-Level Security: users can only access their own Care Spaces
drop policy if exists "Users can view their own care spaces" on public.care_spaces;
create policy "Users can view their own care spaces"
  on public.care_spaces
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own care spaces" on public.care_spaces;
create policy "Users can insert their own care spaces"
  on public.care_spaces
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own care spaces" on public.care_spaces;
create policy "Users can update their own care spaces"
  on public.care_spaces
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own care spaces" on public.care_spaces;
create policy "Users can delete their own care spaces"
  on public.care_spaces
  for delete
  using (auth.uid() = user_id);
