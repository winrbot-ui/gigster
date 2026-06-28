-- Store signup IP for self-referral detection (email + IP block at signup).

alter table public.users add column if not exists signup_ip inet;
