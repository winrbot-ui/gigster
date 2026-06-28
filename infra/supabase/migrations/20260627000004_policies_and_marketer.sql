-- Additional policies, marketer applications, invite validation helper.

-- ---------- marketer_applications ----------
create table public.marketer_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  country text not null,
  pitch text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  user_id uuid references public.users (id),
  reviewed_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.marketer_applications enable row level security;

-- Public can insert applications (no auth required).
create policy marketer_apps_insert_public on public.marketer_applications
  for insert to anon, authenticated with check (true);

create policy marketer_apps_select_own on public.marketer_applications
  for select to authenticated using (email = (select email from public.users where id = (select auth.uid())));

-- ---------- projects: allow owner insert/update ----------
create policy projects_insert_own on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy projects_update_own on public.projects
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- referrals: insert on signup handled via service role ----------
-- Allow users to read referrals where they are referrer
create policy referrals_insert_service on public.referrals
  for insert to authenticated with check (referred_id = (select auth.uid()));

-- ---------- users: allow lookup by username for login (anon) ----------
-- Username existence for invite gate is validated via service role only.

-- ---------- RPC: validate invite @nickname ----------
create or replace function public.validate_invite_nickname(p_nickname text)
returns table (
  valid boolean,
  referrer_id uuid,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_nickname text;
begin
  v_nickname := lower(trim(both '@' from coalesce(p_nickname, '')));
  if v_nickname = '' then
    return query select false, null::uuid, 'empty'::text;
    return;
  end if;

  select * into v_user from public.users u where lower(u.username) = v_nickname limit 1;
  if not found then
    return query select false, null::uuid, 'not_found'::text;
    return;
  end if;

  if v_user.status = 'blocked' then
    return query select false, null::uuid, 'blocked'::text;
    return;
  end if;

  if v_user.status <> 'active' then
    return query select false, null::uuid, 'inactive'::text;
    return;
  end if;

  return query select true, v_user.id, 'ok'::text;
end;
$$;

-- Grant execute to service role (and anon for server-side calls with service key)
grant execute on function public.validate_invite_nickname(text) to anon, authenticated, service_role;
