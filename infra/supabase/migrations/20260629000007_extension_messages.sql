-- Extension: full conversation log + project thread mapping.

do $$ begin
  create type public.message_role as enum ('client', 'assistant');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform project_platform not null,
  thread_id text not null,
  role message_role not null,
  text text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_messages_thread
  on public.conversation_messages (user_id, platform, thread_id, created_at);

alter table public.projects
  add column if not exists thread_id text;

create unique index if not exists idx_projects_user_platform_thread
  on public.projects (user_id, platform, thread_id)
  where thread_id is not null;

alter table public.conversation_messages enable row level security;

do $$ begin
  create policy conversation_messages_select_own on public.conversation_messages
    for select to authenticated using (user_id = (select auth.uid()));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy conversation_messages_insert_own on public.conversation_messages
    for insert to authenticated with check (user_id = (select auth.uid()));
exception
  when duplicate_object then null;
end $$;
