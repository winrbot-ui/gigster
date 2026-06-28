-- Mirror auth.users into public.users on signup.
-- Username + referrer are read from auth user metadata when present; username
-- falls back to the email local-part plus a short suffix to satisfy uniqueness.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text;
  resolved_username text;
  resolved_referrer uuid;
begin
  meta_username := nullif(new.raw_user_meta_data ->> 'username', '');
  resolved_username := coalesce(
    meta_username,
    split_part(new.email, '@', 1) || '_' || left(replace(new.id::text, '-', ''), 6)
  );

  begin
    resolved_referrer := nullif(new.raw_user_meta_data ->> 'referred_by_id', '')::uuid;
  exception when others then
    resolved_referrer := null;
  end;

  insert into public.users (id, email, username, referred_by_id, status, email_verified_at)
  values (
    new.id,
    new.email,
    resolved_username,
    resolved_referrer,
    'pending_email',
    new.email_confirmed_at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep email_verified_at in sync when the user confirms their email.
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
          status = case when status = 'pending_email' then 'pending_payment' else status end
      where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function public.handle_user_email_confirmed();
