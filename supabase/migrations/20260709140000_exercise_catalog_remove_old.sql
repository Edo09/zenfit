-- ==========================================================================
-- Removes the old, pre-catalog exercises (backfilled from free-text
-- routine_exercises.name in 20260708120000_exercise_catalog.sql) now that
-- the curated 220-exercise library from 20260709130000_exercise_catalog_seed.sql
-- is in place.
--
-- "Old" = any exercises row whose created_at doesn't match the batch
-- timestamp of the 220-item seed (all 220 were inserted in one transaction,
-- so they share the exact same created_at; anything backfilled earlier has
-- a different one). Avoids repeating the whole 220-name list here.
--
-- routine_exercises.exercise_id is `on delete restrict` — an old exercise
-- still assigned to a routine will block its own delete. Run in the Supabase
-- SQL editor: https://supabase.com/dashboard/project/_/sql
-- ==========================================================================

-- 1) Preview — what counts as "old", and whether it's still in use.
select
  e.id,
  e.name,
  e.created_at,
  exists (select 1 from public.routine_exercises re where re.exercise_id = e.id) as in_use
from public.exercises e
where e.created_at <> (
  select created_at from public.exercises where lower(name) = lower('Press de Banca Plano')
)
order by in_use desc, e.name;

-- 2) Delete only the old exercises that are NOT referenced by any routine —
--    safe, won't hit the FK-restrict error.
begin;

delete from public.exercises e
where e.created_at <> (
  select created_at from public.exercises where lower(name) = lower('Press de Banca Plano')
)
and not exists (
  select 1 from public.routine_exercises re where re.exercise_id = e.id
);

commit;

-- 3) Anything left over here is an old exercise still assigned to a routine
--    (the delete above skipped it on purpose). Re-run the preview query (1)
--    to see what's left, then for each one either:
--
--    a) Point the routine at a new catalog exercise instead, then delete the old one:
--         update public.routine_exercises
--         set exercise_id = (select id from public.exercises where lower(name) = lower('<new exercise name>'))
--         where exercise_id = '<old exercise id>';
--
--    b) Or just leave it — an old exercise still in use isn't broken, it's
--       just outside the curated 220. Nothing forces you to clean it up.
