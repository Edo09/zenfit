-- ==========================================================================
-- Exercise catalog: a shared, coach-managed library of exercises so the same
-- exercise (name + demo video) can be assigned to many clients without
-- retyping it each time. routine_exercises now references exercises(id)
-- instead of duplicating name/video_url per row — editing the catalog entry
-- instantly updates every client it's assigned to (live reference).
--
-- Run in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql
--
-- This is Part A (additive/backfill only). A separate Part B migration
-- (20260708120100_exercise_catalog_cleanup.sql) drops the now-redundant
-- routine_exercises.name / video_url columns — run that ONLY after
-- confirming the data below backfilled correctly.
-- ==========================================================================

begin;

-- 1) Catalog table ------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  video_url text,
  body_part_id uuid references public.bodyparts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevents the admin panel from re-fragmenting "Burpees" / "burpees" later.
create unique index exercises_name_lower_idx on public.exercises (lower(name));

alter table public.exercises enable row level security;

-- Shared reference data: every signed-in user (coach + clients) can read it;
-- only the coach can manage it (from the Admin Web Panel).
create policy "exercises are viewable by authenticated users"
  on public.exercises for select
  to authenticated
  using (true);

create policy "coach manages exercises"
  on public.exercises for all
  to authenticated
  using (public.is_coach())
  with check (public.is_coach());

grant select on public.exercises to authenticated;
grant insert, update, delete on public.exercises to authenticated;

-- 2) Backfill: turn today's free-text names into catalog rows -----------------
--    Defensive: video_url may not exist yet on some databases (an earlier,
--    separate fix) — add it first so the backfill select below can't fail.
alter table public.routine_exercises
  add column if not exists video_url text;

--    Dedupe case/whitespace-insensitively; prefer a row with a real video_url
--    over a blank duplicate when the same name appears more than once.
insert into public.exercises (name, video_url)
select distinct on (lower(trim(name)))
  trim(name), video_url
from public.routine_exercises
order by lower(trim(name)), (video_url is null) asc, created_at asc;

-- 3) Link routine_exercises -> exercises --------------------------------------
alter table public.routine_exercises
  add column if not exists exercise_id uuid references public.exercises(id) on delete restrict;

update public.routine_exercises re
set exercise_id = e.id
from public.exercises e
where lower(trim(re.name)) = lower(trim(e.name))
  and re.exercise_id is null;

-- Sanity check before locking it down — should return 0 rows. If it doesn't,
-- STOP and investigate before the next statement (it will fail loudly anyway
-- since set not null aborts if any row is still null).
-- select count(*) from public.routine_exercises where exercise_id is null;

alter table public.routine_exercises
  alter column exercise_id set not null;

commit;
