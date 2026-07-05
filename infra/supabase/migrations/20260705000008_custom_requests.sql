-- Custom AI extension lead form (public insert via service role on web server action).

create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  business text,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.custom_requests enable row level security;

-- No public policies — inserts go through backend/admin client only.
create policy custom_requests_admin_all on public.custom_requests
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );
