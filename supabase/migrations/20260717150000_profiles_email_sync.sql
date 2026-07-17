-- ==========================================================================
-- Coach Admin Panel prerequisite: `profiles` has no email column (it lives
-- on auth.users, which the browser anon key cannot query directly — the
-- `auth` schema isn't exposed via PostgREST). The panel's client list,
-- search, and detail screens need it. Denormalize it onto `profiles`,
-- kept in sync by a trigger, rather than an RPC per read — this way every
-- existing profiles query (list/search/join) just works.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.profiles add column if not exists email text;

-- Upsert-only-the-email-column: robust regardless of trigger execution
-- order relative to the pre-existing handle_new_user trigger (which
-- inserts the rest of the profiles row on signup). If that row doesn't
-- exist yet, this creates a minimal one; if it does, this just updates
-- the email in place — no duplicate, no dependency on trigger name order.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Backfill every existing account.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is distinct from u.email);

commit;
