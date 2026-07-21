-- ==========================================================================
-- One active program per client.
--
-- A client follows ONE program at a time; the mobile app fetches the single
-- active program (fetchActiveProgram: status='active' limit 1). Nothing stopped
-- a coach from having several programs 'active' at once, so a second active
-- block was silently hidden in the app while showing in the panel.
--
-- This makes "one active per client" a data rule:
--   1) dedupe any client that already has >1 active (keep the newest);
--   2) a trigger auto-archives a client's other active program whenever one is
--      set active (so create / edit / activate all keep the invariant with no
--      hard failure — activating the next block just demotes the previous one);
--   3) a partial unique index as a backstop.
--
-- The coach still chooses which program is active (panel "Activar" button) and
-- can mark a finished one 'completed'. Additive, idempotent, drift-safe.
-- Run in the Supabase SQL editor (the user applies SQL there, not db push).
-- ==========================================================================

begin;

-- 1) Dedupe existing actives: keep the newest per client, archive the rest.
--    Newest = latest start_date, then latest created_at. Runs once; after the
--    trigger below exists this can never reoccur.
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by start_date desc, created_at desc
         ) as rn
    from public.programs
   where status = 'active'
)
update public.programs p
   set status = 'archived', updated_at = now()
  from ranked r
 where p.id = r.id
   and r.rn > 1;

-- 2) Enforce single-active on every write. When a row is set active, demote the
--    client's OTHER active program(s). SECURITY DEFINER so it can touch the
--    sibling rows regardless of the caller's RLS; only ever flips active ->
--    archived, so it never recurses (the demoting UPDATE sets status <> active).
create or replace function public.enforce_single_active_program()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    update public.programs
       set status = 'archived', updated_at = now()
     where user_id = new.user_id
       and id <> new.id
       and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_single_active_program on public.programs;
create trigger trg_enforce_single_active_program
  before insert or update of status on public.programs
  for each row when (new.status = 'active')
  execute function public.enforce_single_active_program();

-- 3) Backstop: at most one active row per client, enforced by the engine.
create unique index if not exists uniq_one_active_program_per_user
  on public.programs (user_id)
  where status = 'active';

commit;
