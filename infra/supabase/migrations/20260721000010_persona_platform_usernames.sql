-- Marketplace handles on agent persona (Agent setup — at least one required in app validation).

alter table public.agent_personas
  add column if not exists fiverr_username text not null default '',
  add column if not exists freelancer_username text not null default '';
