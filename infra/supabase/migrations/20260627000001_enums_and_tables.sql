-- Gigster core schema: enums + tables.
-- Mirrors docs/02-db-schema.md. RLS policies live in a separate migration.

-- ---------- Enums ----------
create type user_role as enum ('member', 'marketer', 'admin');
create type user_status as enum ('pending_email', 'pending_payment', 'active', 'expired', 'blocked');
create type plan as enum ('basic', 'pro');
create type payment_status as enum ('submitted', 'verified', 'rejected');
create type project_platform as enum ('upwork', 'fiverr', 'freelancer');
create type project_status as enum ('new', 'negotiating', 'deal', 'done');
create type agent2_status as enum ('idle', 'building', 'ready', 'failed');
create type referral_status as enum ('pending', 'qualified', 'churned');

-- ---------- users (mirror of auth.users) ----------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  username text not null unique,
  role user_role not null default 'member',
  referred_by_id uuid references public.users (id),
  status user_status not null default 'pending_email',
  created_at timestamptz not null default now(),
  email_verified_at timestamptz
);

-- ---------- agent_personas (live persona for Agent 1) ----------
create table public.agent_personas (
  user_id uuid primary key references public.users (id) on delete cascade,
  agent_name text not null default '',
  full_name text not null default '',
  title text not null default '',
  specialty text not null default '',
  tone text not null default '',
  experience_years int not null default 0,
  location text not null default '',
  never_say text[] not null default '{}',
  always_do text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- invite_codes ----------
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  code text not null unique,
  uses_remaining int not null default 0,
  expires_at timestamptz
);

-- ---------- referrals ----------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  referred_id uuid not null references public.users (id) on delete cascade,
  qualified_at timestamptz,
  status referral_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

-- ---------- marketer_milestones ----------
create table public.marketer_milestones (
  marketer_id uuid primary key references public.users (id) on delete cascade,
  milestone_20_paid boolean not null default false,
  milestone_40_paid boolean not null default false,
  salary_active boolean not null default false,
  qualified_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- subscriptions ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan plan not null,
  platforms_allowed int not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  active boolean not null default true
);

-- ---------- payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null,
  plan plan not null,
  chain text not null default 'tron',
  tx_hash text not null,
  status payment_status not null default 'submitted',
  paid_at timestamptz,
  verified_by uuid references public.users (id)
);

-- ---------- projects ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform project_platform not null,
  client_name text,
  status project_status not null default 'new',
  project_json jsonb,
  build_spec jsonb,
  brief_score int,
  agent2_status agent2_status not null default 'idle',
  preview_url text,
  preview_slug text unique,
  created_at timestamptz not null default now()
);

-- ---------- message_events ----------
create table public.message_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform project_platform not null,
  client_name text,
  thread_id text,
  detected_at timestamptz not null default now(),
  processed boolean not null default false
);

-- ---------- few_shot_examples (global reference data) ----------
create table public.few_shot_examples (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  client_msg text not null,
  good_reply text not null,
  bad_reply text not null
);

-- ---------- telegram_links ----------
create table public.telegram_links (
  user_id uuid primary key references public.users (id) on delete cascade,
  chat_id text,
  link_code text not null,
  linked_at timestamptz
);

-- ---------- ip_attempts (anti-abuse) ----------
create table public.ip_attempts (
  ip inet not null,
  endpoint text not null,
  attempt_count int not null default 0,
  window_start timestamptz not null default now(),
  primary key (ip, endpoint)
);

-- ---------- Indexes for common lookups ----------
create index idx_users_referred_by on public.users (referred_by_id);
create index idx_invite_codes_owner on public.invite_codes (owner_id);
create index idx_referrals_referrer on public.referrals (referrer_id);
create index idx_referrals_referred on public.referrals (referred_id);
create index idx_subscriptions_user on public.subscriptions (user_id);
create index idx_payments_user on public.payments (user_id);
create index idx_projects_user on public.projects (user_id);
create index idx_message_events_user on public.message_events (user_id);
create index idx_message_events_unprocessed on public.message_events (user_id) where not processed;
