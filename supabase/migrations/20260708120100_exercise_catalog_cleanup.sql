-- ==========================================================================
-- Exercise catalog cleanup (Part B) — drops the now-redundant per-row
-- name/video_url columns from routine_exercises now that every row has a
-- backfilled exercise_id and the app reads name/video live via that join.
--
-- Run this ONLY after 20260708120000_exercise_catalog.sql has been applied
-- and you've confirmed in Supabase Studio that public.exercises looks right
-- and every routine_exercises row has an exercise_id. This step is
-- destructive (the columns are gone for good) — the prior migration is kept
-- separate specifically so you have a manual fallback until you're sure.
--
-- Run in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql
-- ==========================================================================

begin;

alter table public.routine_exercises drop column name;
alter table public.routine_exercises drop column video_url;

commit;
