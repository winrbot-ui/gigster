-- Enable RLS on every table and define owner-scoped policies.
-- The backend uses the service_role key, which bypasses RLS for admin/cron work.
-- Mirrors docs/02-db-schema.md and docs/05-security.md.

alter table public.users enable row level security;
alter table public.agent_personas enable row level security;
alter table public.invite_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.marketer_milestones enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.projects enable row level security;
alter table public.message_events enable row level security;
alter table public.few_shot_examples enable row level security;
alter table public.telegram_links enable row level security;
alter table public.ip_attempts enable row level security;

-- ---------- users ----------
create policy users_select_own on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy users_update_own on public.users
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- agent_personas (self-managed) ----------
create policy personas_select_own on public.agent_personas
  for select to authenticated using (user_id = (select auth.uid()));
create policy personas_insert_own on public.agent_personas
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy personas_update_own on public.agent_personas
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- invite_codes (read own) ----------
create policy invite_codes_select_own on public.invite_codes
  for select to authenticated using (owner_id = (select auth.uid()));

-- ---------- referrals (either side can read) ----------
create policy referrals_select_party on public.referrals
  for select to authenticated
  using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));

-- ---------- marketer_milestones (read own) ----------
create policy milestones_select_own on public.marketer_milestones
  for select to authenticated using (marketer_id = (select auth.uid()));

-- ---------- subscriptions (read own) ----------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- payments (read own, submit own) ----------
create policy payments_select_own on public.payments
  for select to authenticated using (user_id = (select auth.uid()));
create policy payments_insert_own on public.payments
  for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------- projects (read own) ----------
create policy projects_select_own on public.projects
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- message_events (read own) ----------
create policy message_events_select_own on public.message_events
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- telegram_links (read own) ----------
create policy telegram_links_select_own on public.telegram_links
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- few_shot_examples (global, read-only for authenticated) ----------
create policy few_shot_examples_select_all on public.few_shot_examples
  for select to authenticated using (true);

-- ip_attempts: intentionally no policies. Only the service_role (which bypasses
-- RLS) may read/write it.
