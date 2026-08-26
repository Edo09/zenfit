-- ==========================================================================
-- Realtime for coach-assigned ROUTINES.
--
-- 20260807130000_realtime_coach_content.sql put programs, nutrition_plans and
-- supplement_plans on the `supabase_realtime` publication. Zyron's coach
-- assigns FLAT ROUTINES rather than multi-week programs, so `routines` needs
-- the same treatment or a client keeps showing yesterday's plan until they pull
-- to refresh — and on web there is no pull-to-refresh at all.
--
-- WHY ONLY THE PARENT: `save_coach_routine` rewrites the exercise list
-- row-by-row but always touches the routine header in the same transaction, so
-- one event per save is enough. Publishing `routine_exercises` too would fire a
-- burst per save for no extra information.
--
-- REPLICA IDENTITY FULL is required for DELETE: without it Postgres ships only
-- the primary key in the old-row image, so a subscription filtered on
-- `user_id=eq.<me>` can never match a delete and the client would keep showing
-- a routine the coach removed.
--
-- RLS still applies to realtime — a client only ever receives rows their
-- existing "users read own routines" policy already lets them SELECT.
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.routines replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'routines'
  ) then
    alter publication supabase_realtime add table public.routines;
    raise notice 'added routines to supabase_realtime';
  end if;
end $$;

commit;

-- Verify — expect one row:
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--      and tablename = 'routines';
