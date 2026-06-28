-- Desktop auto-mode settings (opt-in RPA preferences per user).

create table public.desktop_auto_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  enabled boolean not null default false,
  disclaimer_accepted boolean not null default false,
  delay_minutes int not null default 15 check (delay_minutes between 3 and 45),
  updated_at timestamptz not null default now()
);

alter table public.desktop_auto_settings enable row level security;

create policy desktop_auto_settings_select_own on public.desktop_auto_settings
  for select to authenticated using (user_id = (select auth.uid()));

create policy desktop_auto_settings_update_own on public.desktop_auto_settings
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy desktop_auto_settings_insert_own on public.desktop_auto_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Marketer milestone tier amounts (documentation columns, payout handled offline).
alter table public.marketer_milestones
  add column if not exists tier_10k_reached_at timestamptz,
  add column if not exists tier_20k_reached_at timestamptz,
  add column if not exists salary_started_at timestamptz;
