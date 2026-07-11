-- Freemium: Agent 1 (drafting) is free until the member's first concluded deal.
-- Adds a 'free' user status and tracks when the first deal is reached so the
-- profile can prompt for payment. The paid payoff (client brief document +
-- Agent 2 site build) stays gated behind an active subscription.

-- New status sits between pending_email and pending_payment in the lifecycle.
alter type user_status add value if not exists 'free' before 'pending_payment';

-- Track the first concluded deal (brief ready) that triggers the paywall.
alter table public.users
  add column if not exists has_reached_deal boolean not null default false,
  add column if not exists first_deal_at timestamptz;

-- After email confirmation a new member becomes 'free' (was 'pending_payment')
-- so they can use Agent 1 before paying. Existing rows are left untouched.
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email_confirmed_at <> new.email_confirmed_at) then
    update public.users
      set email_verified_at = new.email_confirmed_at,
          status = case when status = 'pending_email' then 'free' else status end
      where id = new.id;
  end if;
  return new;
end;
$$;
