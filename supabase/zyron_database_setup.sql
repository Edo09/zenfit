-- ==========================================================================
-- ZYRON — full database setup for a NEW, EMPTY Supabase project.
--
-- Recreates exactly the schema Zyron runs against today on the shared project
-- (tables, RLS policies, functions, triggers, realtime, the meal-photos bucket
-- and the exercise catalog with videos + instructions), so the current Zyron
-- build works against it unchanged. Then a final ZYRON STANDALONE section
-- makes it a single-app project.
--
-- GENERATED from the migration files (do not hand-edit the numbered sections;
-- regenerate instead). It is the concatenation, in timestamp order, of:
--   zenfit/supabase-schema.sql
--   [01] 20260704120000_add_calorie_goal.sql  (both repos)
--   [02] 20260705120000_meal_photos.sql  (both repos)
--   [03] 20260705130000_meal_items_update_policy.sql  (both repos)
--   [04] 20260707120000_coaching_platform.sql  (both repos)
--   [05] 20260708120000_exercise_catalog.sql  (both repos)
--   [06] 20260708120100_exercise_catalog_cleanup.sql  (both repos)
--   [07] 20260709130000_exercise_catalog_seed.sql  (both repos)
--   [08] 20260709140000_exercise_catalog_remove_old.sql  (both repos)
--   [09] 20260709150000_profile_goal.sql  (both repos)
--   [10] 20260710120000_body_measurements.sql  (both repos)
--   [11] 20260716120000_routine_source.sql  (both repos)
--   [12] 20260717120000_coach_programs.sql  (both repos)
--   [13] 20260717120100_coach_programs_catalog_topup.sql  (both repos)
--   [14] 20260717130000_program_exercise_completions.sql  (both repos)
--   [15] 20260717140000_body_measurements_coach_read.sql  (both repos)
--   [16] 20260717150000_profiles_email_sync.sql  (both repos)
--   [17] 20260717150100_memberships_one_per_client.sql  (both repos)
--   [18] 20260720120000_save_coach_routine_rpc.sql  (both repos)
--   [19] 20260720130000_save_coach_program_rpc.sql  (both repos)
--   [20] 20260721120000_exercise_video_urls.sql  (both repos)
--   [21] 20260721130000_single_active_program.sql  (both repos)
--   [22] 20260722120000_solo_account_type.sql  (both repos)
--   [23] 20260723120000_exercise_instructions.sql  (hokage-coaching-app only)
--   [24] 20260724120000_program_templates.sql  (hokage-coaching-app only)
--   [25] 20260803120000_start_date_timezone_tolerance.sql  (hokage-coaching-app only)
--   [26] 20260807120000_nutrition_plans.sql  (both repos)
--   [27] 20260807120100_supplement_plans.sql  (both repos)
--   [28] 20260807120200_nutrition_items_drop_quantity.sql  (both repos)
--   [29] 20260807130000_realtime_coach_content.sql  (both repos)
--   [30] 20260826120000_zyron_app_scope.sql  (zenfit only)
--   [31] 20260826120100_realtime_coach_routines.sql  (zenfit only)
--   [32] 20260827120000_routine_templates.sql  (zenfit only)
--   [33] 20260925120000_plan_edits_keep_history.sql  (hokage-coaching-app only)
--
-- Four of these exist only in hokage-coaching-app, but the live database has
-- them and Zyron must match it: 20260723120000 adds exercises.instructions_en/_es,
-- which Zyron's own routine screen reads; 20260724120000 (program templates) and
-- 20260803120000 (start-date tolerance) keep the schema identical to the live
-- one; 20260925120000 stops coach edits from erasing client history.
-- Exercises the coach created by hand in the panel are data, not migrations --
-- they are NOT copied (224 catalog exercises come from the migrations).
-- zenfit/supabase/migrations itself still lacks those four files, so until
-- they are copied there, rebuilding from the repo will NOT reproduce this DB.
--
-- HOW TO RUN: on a brand-new project only (the base schema is not re-runnable).
-- Paste the whole file into the SQL editor and run it; if the editor chokes on
-- the size (~520 KB), use psql -- with UTF-8 forced, or on Windows every
-- accented exercise name is stored garbled:
--   PowerShell:  $env:PGCLIENTENCODING = 'UTF8'
--                psql "<Session pooler connection string>" -v ON_ERROR_STOP=1 -f supabase/zyron_database_setup.sql
--   (Settings -> Database -> Connection string -> Session pooler: the direct
--   db.<ref>.supabase.co host is IPv6-only on new projects.)
--
-- AFTER RUNNING:
--   1. Storage -> exercise-media (created below): upload the exercise GIFs --
--      copy them from the OLD project's exercise-media bucket -- then run the
--      REQUIRED block at the very end, so video_url points at THIS project.
--      Otherwise Zyron keeps loading every demo from Hokage's project.
--   2. Deploy create-client to THIS project. zenfit's CLI is still linked to
--      the old project, so pass the ref explicitly:
--        supabase functions deploy create-client --project-ref <ZYRON_PROJECT_REF>
--      SUPABASE_SERVICE_ROLE_KEY is provided to functions automatically (the
--      CLI refuses to set SUPABASE_* secrets). Not needed until a Zyron panel
--      exists; when it does, make create-client set account_type 'coached'
--      (new profiles here default to 'solo').
--   3. Authentication: keep sign-ups ON (Zyron users register themselves) and
--      configure email confirmation / SMTP and the redirect URLs.
--   4. Create the coach account(s), then:  update public.profiles set role = 'coach' where email = '...';
--   5. Point Zyron at this project: EXPO_PUBLIC_SUPABASE_URL and
--      EXPO_PUBLIC_SUPABASE_KEY (this project's anon key) in EAS (preview +
--      production) and in Vercel for the web export; rebuild. Smoke-test a
--      sign-up + one screen on the new build BEFORE running the Hokage
--      conversion on the old project -- that deletes the old Zyron accounts.
-- ==========================================================================

-- psql reads this file in the console code page unless told otherwise; the
-- SQL editor ignores it. Keeps every accented name intact either way.
set client_encoding = 'UTF8';

-- ==========================================================================
-- [00] BASE SCHEMA — zenfit/supabase-schema.sql
-- ==========================================================================
-- ============================================================
-- Zyron App Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- 1. PROFILES
-- Auto-created for each user via trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  age integer,
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric,
  weight_kg numeric,
  activity_level text check (activity_level in ('sedentary', 'active', 'very_active')),
  profession_type text check (profession_type in ('desk', 'physical')),
  days_per_week integer,
  session_duration integer, -- minutes
  available_days text[], -- e.g. {'Mon','Tue','Thu','Sat'}
  onboarding_completed boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. ROUTINES
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  day_of_week text, -- 'monday', 'tuesday', etc. or null for any day
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.routines enable row level security;

create policy "Users can view own routines"
  on public.routines for select
  using (auth.uid() = user_id);

create policy "Users can create own routines"
  on public.routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routines"
  on public.routines for update
  using (auth.uid() = user_id);

create policy "Users can delete own routines"
  on public.routines for delete
  using (auth.uid() = user_id);


-- 3. ROUTINE EXERCISES
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references public.routines(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  sets integer default 3,
  reps integer default 10,
  weight_kg numeric,
  rest_seconds integer default 60,
  sort_order integer default 0,
  notes text,
  video_url text,
  created_at timestamptz default now() not null
);

-- Idempotent: adds the demo-video column to existing databases too.
alter table public.routine_exercises
  add column if not exists video_url text;

alter table public.routine_exercises enable row level security;

create policy "Users can view own exercises"
  on public.routine_exercises for select
  using (auth.uid() = user_id);

create policy "Users can create own exercises"
  on public.routine_exercises for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exercises"
  on public.routine_exercises for update
  using (auth.uid() = user_id);

create policy "Users can delete own exercises"
  on public.routine_exercises for delete
  using (auth.uid() = user_id);


-- 4. MEALS
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  date date not null default current_date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.meals enable row level security;

create policy "Users can view own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can create own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meals"
  on public.meals for update
  using (auth.uid() = user_id);

create policy "Users can delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);


-- 5. MEAL ITEMS
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  calories integer default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  portion text, -- e.g. '1 cup', '200g'
  created_at timestamptz default now() not null
);

alter table public.meal_items enable row level security;

create policy "Users can view own meal items"
  on public.meal_items for select
  using (auth.uid() = user_id);

create policy "Users can create own meal items"
  on public.meal_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal items"
  on public.meal_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal items"
  on public.meal_items for delete
  using (auth.uid() = user_id);


-- 6. WORKOUT LOGS
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  routine_id uuid references public.routines(id) on delete set null,
  routine_name text not null, -- denormalized so it persists if routine is deleted
  date date not null default current_date,
  duration_minutes integer,
  notes text,
  completed_exercises text[],
  created_at timestamptz default now() not null
);

alter table public.workout_logs enable row level security;

create policy "Users can view own workout logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can create own workout logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own workout logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);


-- Grant table permissions to authenticated users
-- (bodyparts grants live in section 7, after the table exists)
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.meals to authenticated;
grant select, insert, update, delete on public.meal_items to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;

-- Indexes for common queries
create index idx_routines_user_id on public.routines(user_id);
create index idx_routine_exercises_routine_id on public.routine_exercises(routine_id);
create index idx_meals_user_id_date on public.meals(user_id, date);
create index idx_meal_items_meal_id on public.meal_items(meal_id);
create index idx_workout_logs_user_id_date on public.workout_logs(user_id, date);


-- 7. BODY PARTS (Reference Table)
create table public.bodyparts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now() not null
);

alter table public.bodyparts enable row level security;

create policy "Body parts are viewable by everyone"
  on public.bodyparts for select
  using (true);

grant select on public.bodyparts to authenticated;
grant select on public.bodyparts to anon;

insert into public.bodyparts (name) values
  ('back'), ('cardio'), ('chest'), ('lower arms'), ('lower legs'),
  ('neck'), ('shoulders'), ('upper arms'), ('upper legs'), ('waist');

-- ==========================================================================
-- [01] 20260704120000_add_calorie_goal.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Adds the user-configurable daily calorie goal to profiles.
-- Run in the Supabase SQL editor (or `supabase db push` if the CLI is linked):
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

alter table public.profiles
  add column if not exists calorie_goal integer;

comment on column public.profiles.calorie_goal is
  'Target daily calorie intake (kcal). Null = not set; app falls back to a recommendation derived from age/sex/height/weight/activity.';

-- ==========================================================================
-- [02] 20260705120000_meal_photos.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Meal photos: thumbnail per food item, stored in Supabase Storage.
-- Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

-- 1) Where the item's photo lives in the meal-photos bucket ("<userId>/<uuid>.jpg")
alter table public.meal_items
  add column if not exists photo_path text;

-- 2) Public bucket: paths contain client-generated UUIDs (unguessable), and
--    public URLs keep thumbnails synchronous + cacheable offline by expo-image.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

-- 3) Writes stay owner-scoped: first path folder must equal auth.uid()
create policy "meal photos: users upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "meal photos: users delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ==========================================================================
-- [03] 20260705130000_meal_items_update_policy.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Editing food items syncs as an upsert (INSERT ... ON CONFLICT DO UPDATE),
-- which needs an UPDATE policy on meal_items. Idempotent: only creates one
-- if no UPDATE policy exists yet.
-- Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meal_items'
      and cmd = 'UPDATE'
  ) then
    create policy "meal_items: users update own"
      on public.meal_items for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ==========================================================================
-- [04] 20260707120000_coaching_platform.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coaching platform support: roles, provenance, single-coach access,
-- client read-only on assigned plans, memberships. Additive & drift-safe.
--
-- Run via `supabase db push` if the CLI is linked, or paste into the
-- Supabase SQL editor: https://supabase.com/dashboard/project/_/sql
--
-- Model: two roles ('user','coach'). Exactly one coach (the gym owner/buyer),
-- so a single is_coach() predicate authorizes cross-client access — no
-- coach_clients link table. Clients stay self-scoped; coach-assigned plans
-- (assigned_by is not null) are read-only to the client but editable by coach.
-- ==========================================================================

-- 1) Roles ------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('user','coach'));
  end if;
end $$;

-- 2) Coach WhatsApp (international digits, e.g. '5215512345678') -------------
alter table public.profiles add column if not exists whatsapp text;

-- 3) Plan provenance --------------------------------------------------------
alter table public.routines add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.meals    add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
create index if not exists idx_routines_assigned_by on public.routines(assigned_by);
create index if not exists idx_meals_assigned_by    on public.meals(assigned_by);

-- 4) Helpers (security definer, STABLE, locked search_path) ------------------
create or replace function public.is_coach()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach');
$$;
create or replace function public.is_assigned_routine(rid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.routines r where r.id = rid and r.assigned_by is not null);
$$;
create or replace function public.is_assigned_meal(mid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.meals m where m.id = mid and m.assigned_by is not null);
$$;

-- 5) Block self role escalation --------------------------------------------
-- Role is set out-of-band (dashboard/service role). No client may change it.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Block only role changes made by an authenticated end-user (via the API,
  -- where auth.uid() is set). Direct DB / dashboard access (auth.uid() null)
  -- and the service role are allowed to manage roles.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role changes are not permitted from the client';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_role_change on public.profiles;
create trigger trg_guard_role_change before update on public.profiles
  for each row execute function public.guard_role_change();

-- 6) Clients can read the single coach profile (name/avatar/whatsapp) --------
drop policy if exists "coach profile readable by clients" on public.profiles;
create policy "coach profile readable by clients" on public.profiles for select using (role = 'coach');

-- 7) Coach full access (additive PERMISSIVE; single-coach model) -------------
drop policy if exists "coach reads all profiles"   on public.profiles;
create policy "coach reads all profiles"   on public.profiles for select using (public.is_coach());
drop policy if exists "coach updates all profiles" on public.profiles;
create policy "coach updates all profiles" on public.profiles for update using (public.is_coach()) with check (public.is_coach());

drop policy if exists "coach all routines"          on public.routines;
create policy "coach all routines"          on public.routines          for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all routine_exercises" on public.routine_exercises;
create policy "coach all routine_exercises" on public.routine_exercises for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all meals"             on public.meals;
create policy "coach all meals"             on public.meals             for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all meal_items"        on public.meal_items;
create policy "coach all meal_items"        on public.meal_items        for all using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all workout_logs"      on public.workout_logs;
create policy "coach all workout_logs"      on public.workout_logs      for all using (public.is_coach()) with check (public.is_coach());

-- 8) Clients: coach-assigned plans are READ-ONLY (AND-ed RESTRICTIVE) --------
--    Restrictive policies narrow whatever the existing permissive self-policies
--    allow, without needing to know their (drifted) names. Coach is exempt.
drop policy if exists "routines assigned read-only (upd)" on public.routines;
create policy "routines assigned read-only (upd)" on public.routines as restrictive for update
  using (public.is_coach() or assigned_by is null) with check (public.is_coach() or assigned_by is null);
drop policy if exists "routines assigned read-only (del)" on public.routines;
create policy "routines assigned read-only (del)" on public.routines as restrictive for delete
  using (public.is_coach() or assigned_by is null);
drop policy if exists "routines no self-fake assign (ins)" on public.routines;
create policy "routines no self-fake assign (ins)" on public.routines as restrictive for insert
  with check (public.is_coach() or assigned_by is null);

drop policy if exists "meals assigned read-only (upd)" on public.meals;
create policy "meals assigned read-only (upd)" on public.meals as restrictive for update
  using (public.is_coach() or assigned_by is null) with check (public.is_coach() or assigned_by is null);
drop policy if exists "meals assigned read-only (del)" on public.meals;
create policy "meals assigned read-only (del)" on public.meals as restrictive for delete
  using (public.is_coach() or assigned_by is null);
drop policy if exists "meals no self-fake assign (ins)" on public.meals;
create policy "meals no self-fake assign (ins)" on public.meals as restrictive for insert
  with check (public.is_coach() or assigned_by is null);

drop policy if exists "exercises of assigned read-only (upd)" on public.routine_exercises;
create policy "exercises of assigned read-only (upd)" on public.routine_exercises as restrictive for update
  using (public.is_coach() or not public.is_assigned_routine(routine_id));
drop policy if exists "exercises of assigned read-only (del)" on public.routine_exercises;
create policy "exercises of assigned read-only (del)" on public.routine_exercises as restrictive for delete
  using (public.is_coach() or not public.is_assigned_routine(routine_id));

drop policy if exists "items of assigned read-only (upd)" on public.meal_items;
create policy "items of assigned read-only (upd)" on public.meal_items as restrictive for update
  using (public.is_coach() or not public.is_assigned_meal(meal_id));
drop policy if exists "items of assigned read-only (del)" on public.meal_items;
create policy "items of assigned read-only (del)" on public.meal_items as restrictive for delete
  using (public.is_coach() or not public.is_assigned_meal(meal_id));

-- 9) Memberships (coach-managed status; client reads own) -------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id  uuid references public.profiles(id) on delete set null,
  plan_name text,
  status text not null default 'active' check (status in ('active','expired','paused','cancelled')),
  price numeric,
  currency text default 'USD',
  started_at date not null default current_date,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_memberships_client on public.memberships(client_id);
alter table public.memberships enable row level security;
drop policy if exists "client views own membership" on public.memberships;
create policy "client views own membership" on public.memberships for select using (client_id = auth.uid());
drop policy if exists "coach manages memberships" on public.memberships;
create policy "coach manages memberships" on public.memberships for all
  using (public.is_coach()) with check (public.is_coach());

-- 10) Grants ----------------------------------------------------------------
grant select, insert, update, delete on public.memberships to authenticated;

-- ==========================================================================
-- [05] 20260708120000_exercise_catalog.sql   (from hokage-coaching-app)
-- ==========================================================================
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

-- ==========================================================================
-- [06] 20260708120100_exercise_catalog_cleanup.sql   (from hokage-coaching-app)
-- ==========================================================================
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

-- ==========================================================================
-- [07] 20260709130000_exercise_catalog_seed.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Bulk-seeds the exercise catalog (public.exercises) with a 220-exercise
-- library (upper + lower body), grouped by primary muscle and mapped onto
-- the existing public.bodyparts categories (back/cardio/chest/lower arms/
-- lower legs/neck/shoulders/upper arms/upper legs/waist).
--
-- Additive and safe to re-run: relies on the unique index on lower(name)
-- from 20260708120000_exercise_catalog.sql, so already-present names are
-- skipped rather than duplicated.
--
-- Equipment "variants" from the source list aren't imported — the schema
-- has no field for them, just name/video_url/body_part_id. Body-part tags
-- are a best-effort single primary-muscle pick for compound movements
-- (e.g. deadlifts, hip thrusts) — retag via Table Editor / Admin Panel if
-- you want a different grouping.
--
-- Run in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql
-- ==========================================================================

begin;

with data(name, body_part_key) as (
  values
    -- A. Empuje horizontal (pecho + tríceps + hombro anterior)
    ('Press de Banca Plano', 'chest'),
    ('Press de Banca Inclinado (45°)', 'chest'),
    ('Press de Banca Declinado', 'chest'),
    ('Press de Banca con Agarre Cerrado', 'chest'),
    ('Press de Banca con Agarre Abierto', 'chest'),
    ('Press de Banca con Pausa en Pecho', 'chest'),
    ('Press de Banca con Bajada Lenta (Tempo 3-1-1)', 'chest'),
    ('Press de Banca en Suelo (Floor Press)', 'chest'),
    ('Press de Banca con Mancuerna en Rotación Neutra', 'chest'),
    ('Press de Banca en Máquina Guiada', 'chest'),
    ('Press de Banca Unilateral', 'chest'),

    -- B. Empuje vertical (hombro + tríceps)
    ('Press Militar (por encima de la cabeza)', 'shoulders'),
    ('Press Arnold', 'shoulders'),
    ('Press de Hombro en Máquina', 'shoulders'),
    ('Press de Hombro con Agarre Neutro', 'shoulders'),
    ('Press de Hombro a 1 Brazo', 'shoulders'),
    ('Press de Hombro con Pausa en la Cabeza', 'shoulders'),
    ('Press de Hombro con Bajada Detrás de la Cabeza', 'shoulders'),

    -- C. Aperturas y vuelos (pecho + hombro)
    ('Aperturas en Banco Plano', 'chest'),
    ('Aperturas en Banco Inclinado', 'chest'),
    ('Aperturas en Banco Declinado', 'chest'),
    ('Aperturas en Máquina (Peck Deck)', 'chest'),
    ('Cruces en Polea Alta', 'chest'),
    ('Cruces en Polea Baja', 'chest'),
    ('Cruces en Polea Media', 'chest'),
    ('Aperturas con Goma Elástica', 'chest'),
    ('Aperturas con Mancuerna a 1 Brazo', 'chest'),
    ('Elevaciones Laterales (Deltoides Medio)', 'shoulders'),
    ('Elevaciones Frontales (Deltoides Anterior)', 'shoulders'),
    ('Elevaciones Laterales Inclinado', 'shoulders'),
    ('Elevaciones Laterales con Rotación Externa', 'shoulders'),
    ('Vuelos Posteriores (Deltoides Posterior)', 'shoulders'),
    ('Face Pull (Deltoides Posterior + Manguito)', 'shoulders'),

    -- D. Fondos (pecho + tríceps + hombro anterior)
    ('Fondos en Paralelas', 'chest'),
    ('Fondos en Banco (Tríceps)', 'chest'),
    ('Fondos Asistidos', 'chest'),
    ('Fondos con Banda Elástica', 'chest'),
    ('Fondos en Anillas', 'chest'),

    -- E. Tríceps (aislados)
    ('Extensiones de Tríceps por Encima de la Cabeza', 'upper arms'),
    ('Extensiones de Tríceps en Polea (Pushdown)', 'upper arms'),
    ('Extensiones de Tríceps en Polea Invertido', 'upper arms'),
    ('Extensiones de Tríceps en Máquina', 'upper arms'),
    ('Patada de Tríceps (Kickback)', 'upper arms'),
    ('Extensiones de Tríceps en Banco Plano (Skull Crusher)', 'upper arms'),
    ('Extensiones de Tríceps en Banco Inclinado', 'upper arms'),
    ('Extensiones de Tríceps con Agarre Neutro', 'upper arms'),
    ('Extensiones de Tríceps a 1 Brazo en Polea', 'upper arms'),
    ('Extensiones de Tríceps con Goma', 'upper arms'),
    ('Dips de Tríceps en Máquina', 'upper arms'),

    -- F. Tirón vertical (espalda - ancho + bíceps)
    ('Dominadas con Agarre Prono (Front)', 'back'),
    ('Dominadas con Agarre Supino (Rear)', 'back'),
    ('Dominadas con Agarre Neutro', 'back'),
    ('Dominadas con Agarre Abierto', 'back'),
    ('Dominadas con Agarre Cerrado', 'back'),
    ('Dominadas con Pausa en el Punto Superior', 'back'),
    ('Dominadas con Bajada Lenta (Tempo)', 'back'),
    ('Jalones al Pecho en Polea (Front)', 'back'),
    ('Jalones Tras Nuca en Polea', 'back'),
    ('Jalones en Máquina (Lat Pulldown)', 'back'),
    ('Jalones a 1 Brazo en Polea', 'back'),
    ('Dominadas en Máquina Asistida', 'back'),

    -- G. Tirón horizontal (espalda - dorsal + romboides + trapecio)
    ('Remo Inclinado con Barra (Barbell Row)', 'back'),
    ('Remo Inclinado con Barra en T (T-Bar Row)', 'back'),
    ('Remo con Mancuerna a 2 Manos', 'back'),
    ('Remo con Mancuerna a 1 Mano (One-Arm Row)', 'back'),
    ('Remo en Máquina Sentado (Cable Row)', 'back'),
    ('Remo en Máquina Convergente', 'back'),
    ('Remo en Polea Baja con Agarre Supino', 'back'),
    ('Remo en Polea Baja con Agarre Abierto', 'back'),
    ('Remo con Barra Z (agarre en pronación)', 'back'),
    ('Remo Inclinado con Pausa en el Pecho', 'back'),
    ('Remo Inclinado con Bajada Excéntrica Lenta', 'back'),
    ('Remo Gironda (V-Bar Row)', 'back'),
    ('Remo con Barra de Trampa (Hex Bar Row)', 'back'),

    -- H. Hombro posterior + trapecio
    ('Encogimientos de Hombros (Shrugs)', 'shoulders'),
    ('Encogimientos Detrás de la Espalda', 'shoulders'),
    ('Encogimientos en Máquina', 'shoulders'),
    ('Remo al Mentón (Upright Row)', 'shoulders'),
    ('Remo al Mentón con Agarre Ancho', 'shoulders'),
    ('Remo al Mentón con Agarre Estrecho', 'shoulders'),
    ('Face Pull con Rotación Externa', 'shoulders'),
    ('Face Pull con Pausa', 'shoulders'),

    -- I. Bíceps (aislados)
    ('Curl de Bíceps con Barra Recta', 'upper arms'),
    ('Curl de Bíceps con Barra Z', 'upper arms'),
    ('Curl de Bíceps con Mancuernas', 'upper arms'),
    ('Curl de Bíceps en Banco Scott', 'upper arms'),
    ('Curl de Bíceps en Polea (Cable Curl)', 'upper arms'),
    ('Curl de Bíceps en Máquina', 'upper arms'),
    ('Curl de Bíceps con Agarre Neutro (Martillo)', 'upper arms'),
    ('Curl de Bíceps con Agarre Prono (Inverso)', 'upper arms'),
    ('Curl de Bíceps con Agarre Cruzado', 'upper arms'),
    ('Curl de Bíceps en Inclinado', 'upper arms'),
    ('Curl de Bíceps con Goma Elástica', 'upper arms'),
    ('Curl de Bíceps en Suspensión (TRX)', 'upper arms'),

    -- J. Antebrazo (aislados)
    ('Curl de Muñeca con Barra', 'lower arms'),
    ('Curl de Muñeca con Mancuerna', 'lower arms'),
    ('Curl de Muñeca Inverso', 'lower arms'),
    ('Rodillo de Muñeca (Wrist Roller)', 'lower arms'),
    ('Farmer''s Walk (sujeción)', 'lower arms'),
    ('Sujeción con Pinza (Plate Pinch)', 'lower arms'),
    ('Flexión de Dedos con Goma', 'lower arms'),

    -- K. Sentadillas y derivados (cuádriceps + glúteo)
    ('Sentadilla Trasera con Barra Alta', 'upper legs'),
    ('Sentadilla Trasera con Barra Baja', 'upper legs'),
    ('Sentadilla Frontal', 'upper legs'),
    ('Sentadilla Zercher', 'upper legs'),
    ('Sentadilla con Barra de Trampa (Hex Bar Squat)', 'upper legs'),
    ('Sentadilla Goblet (Copa)', 'upper legs'),
    ('Sentadilla con Mancuernas a los Lados', 'upper legs'),
    ('Sentadilla con Pausa en el Punto Bajo', 'upper legs'),
    ('Sentadilla con Bajada Lenta (Tempo 4-1-1)', 'upper legs'),
    ('Sentadilla con Banda Elástica', 'upper legs'),
    ('Sentadilla con Cadenas', 'upper legs'),
    ('Sentadilla en Máquina Smith', 'upper legs'),
    ('Sentadilla en Máquina Hack', 'upper legs'),
    ('Sentadilla en Máquina Multipower', 'upper legs'),
    ('Sentadilla Búlgara (Búlgar Split Squat)', 'upper legs'),
    ('Sentadilla Búlgara con Pausa', 'upper legs'),
    ('Pistol Squat (Sentadilla a 1 Pierna)', 'upper legs'),
    ('Sentadilla con Pierna Adelantada (Split Squat)', 'upper legs'),
    ('Sentadilla Sissy (Sissy Squat)', 'upper legs'),
    ('Sentadilla con Apoyo en Pared (Wall Squat)', 'upper legs'),
    ('Sentadilla con Salto (Jump Squat)', 'upper legs'),

    -- L. Prensa de piernas (cuádriceps + glúteo)
    ('Prensa de Piernas Horizontal', 'upper legs'),
    ('Prensa de Piernas Inclinada (45°)', 'upper legs'),
    ('Prensa de Piernas Unilateral', 'upper legs'),
    ('Prensa de Piernas con Pausa', 'upper legs'),

    -- M. Peso muerto y derivados (cadena posterior)
    ('Peso Muerto Convencional', 'upper legs'),
    ('Peso Muerto Sumo', 'upper legs'),
    ('Peso Muerto Rumano (RDL)', 'upper legs'),
    ('Peso Muerto con Piernas Rígidas (Stiff-Leg)', 'upper legs'),
    ('Peso Muerto Deficitario', 'upper legs'),
    ('Peso Muerto con Barra de Trampa (Hex Bar DL)', 'upper legs'),
    ('Peso Muerto con Pausa', 'upper legs'),
    ('Peso Muerto con Cadena o Banda', 'upper legs'),
    ('Peso Muerto a 1 Pierna', 'upper legs'),
    ('Peso Muerto con Agarre Invertido (Snatch Grip)', 'upper legs'),
    ('Peso Muerto desde Bloque (Rack Pull)', 'upper legs'),
    ('Peso Muerto con Piernas Extendidas (Romanian con déficit)', 'upper legs'),
    ('Peso Muerto Invertido (Deficit RDL)', 'upper legs'),

    -- N. Hip thrust y glúteo (hip-dominance)
    ('Hip Thrust con Barra', 'upper legs'),
    ('Hip Thrust con Mancuerna', 'upper legs'),
    ('Hip Thrust en Máquina', 'upper legs'),
    ('Hip Thrust Unilateral', 'upper legs'),
    ('Hip Thrust con Banda Elástica', 'upper legs'),
    ('Hip Thrust con Pausa en el Punto Superior', 'upper legs'),
    ('Glute Bridge (Puente de Glúteo en Suelo)', 'upper legs'),
    ('Glute Bridge Unilateral', 'upper legs'),
    ('Patada de Glúteo en Polea (Donkey Kick)', 'upper legs'),
    ('Patada de Glúteo en Máquina', 'upper legs'),
    ('Patada de Glúteo en 4 Apoyos (Fire Hydrant)', 'upper legs'),

    -- O. Zancadas y estocadas (cuádriceps + glúteo + isquios)
    ('Zancada Caminando (Walking Lunge)', 'upper legs'),
    ('Zancada Hacia Atrás (Reverse Lunge)', 'upper legs'),
    ('Zancada Lateral (Side Lunge)', 'upper legs'),
    ('Zancada Cruzada (Curtsy Lunge)', 'upper legs'),
    ('Zancada con Pierna Elevada Trasera (Búlgaro)', 'upper legs'),
    ('Zancada con Pausa en el Punto Bajo', 'upper legs'),
    ('Zancada con Salto (Jump Lunge)', 'upper legs'),
    ('Zancada con Desplazamiento Lateral (Skater Squat)', 'upper legs'),

    -- P. Flexión de rodilla (isquiotibiales - aislados)
    ('Curl de Femoral Tumbado (Prone Leg Curl)', 'upper legs'),
    ('Curl de Femoral Sentado (Seated Leg Curl)', 'upper legs'),
    ('Curl de Femoral de Pie (Standing Leg Curl)', 'upper legs'),
    ('Curl de Femoral Unilateral (a 1 Pierna)', 'upper legs'),
    ('Nordic Curl (Curl Nórdico)', 'upper legs'),
    ('Nordic Curl Asistido con Banda', 'upper legs'),
    ('Curl de Femoral con Goma Elástica', 'upper legs'),
    ('Curl de Femoral con Mancuerna (entre pies)', 'upper legs'),

    -- Q. Extensión de rodilla (cuádriceps - aislados)
    ('Extensión de Cuádriceps en Máquina Sentado', 'upper legs'),
    ('Extensión de Cuádriceps con Pausa', 'upper legs'),
    ('Extensión de Cuádriceps con Bajada Lenta (Tempo)', 'upper legs'),
    ('Extensión de Cuádriceps con Goma Elástica', 'upper legs'),
    ('Sissy Squat (Sentadilla Sissy)', 'upper legs'),

    -- R. Gemelos y sóleo (pantorrillas)
    ('Elevación de Gemelos de Pie (Standing Calf Raise)', 'lower legs'),
    ('Elevación de Gemelos de Pie a 1 Pierna', 'lower legs'),
    ('Elevación de Gemelos Sentado (Seated Calf Raise)', 'lower legs'),
    ('Elevación de Gemelos en Prensa de Piernas', 'lower legs'),
    ('Elevación de Gemelos con Banda Elástica', 'lower legs'),
    ('Elevación de Gemelos con Déficit', 'lower legs'),
    ('Saltos de Gemelos (Pliométricos)', 'lower legs'),

    -- S. Good morning y flexión de cadera (isquios + erectores)
    ('Good Morning con Barra', 'back'),
    ('Good Morning con Barra Baja', 'back'),
    ('Good Morning con Mancuerna (Goblet Style)', 'back'),
    ('Good Morning con Banda Elástica', 'back'),
    ('Good Morning con Pausa', 'back'),
    ('Good Morning con Piernas Separadas (Sumo Good Morning)', 'back'),

    -- T. Hiperextensiones y extensión de espalda
    ('Hiperextensiones en Banco (Back Extension)', 'back'),
    ('Hiperextensiones a 45°', 'back'),
    ('Hiperextensiones en Suelo (Superman)', 'back'),
    ('Hiperextensiones Unilateral (a 1 pierna)', 'back'),
    ('Hiperextensiones con Pausa', 'back'),

    -- U. Abductores y aductores (aislados)
    ('Máquina de Aductores (Adductor Machine)', 'upper legs'),
    ('Máquina de Abductores (Abductor Machine)', 'upper legs'),
    ('Abductores en Polea (Cable Hip Abduction)', 'upper legs'),
    ('Aductores en Polea (Cable Hip Adduction)', 'upper legs'),
    ('Elevación de Pierna Lateral (Side-Lying Leg Raise)', 'upper legs'),

    -- V. Core y estabilizadores
    ('Plancha (Plank)', 'waist'),
    ('Plancha con Banda Elástica', 'waist'),
    ('Rueda Abdominal (Ab Wheel Rollout)', 'waist'),
    ('Dragon Flag', 'waist'),
    ('L-Sit', 'waist'),
    ('Elevación de Piernas Colgado (Hanging Leg Raise)', 'waist'),
    ('Elevación de Piernas en Banco (Decline Leg Raise)', 'waist'),
    ('Giros Rusos (Russian Twist)', 'waist'),
    ('Giro con Cable (Cable Woodchop)', 'waist'),
    ('Pallof Press (Prensa Pallof)', 'waist'),
    ('Farmer''s Walk', 'waist'),
    ('Suitcase Carry (Carga Maletero)', 'waist'),
    ('Dead Bug', 'waist'),
    ('Abdominales en Máquina', 'waist'),
    ('Abdominales en Suelo (Crunch)', 'waist'),
    ('Abdominales Inversos (Reverse Crunch)', 'waist'),

    -- W. Ejercicios funcionales y accesorios
    ('Kettlebell Swing', 'upper legs'),
    ('Clean (Levantamiento)', 'upper legs'),
    ('Snatch (Arrancada)', 'upper legs'),
    ('Thruster (Sentadilla + Press)', 'upper legs'),
    ('Burpee', 'cardio'),
    ('Peso Muerto con Kettlebell (Goblet DL)', 'upper legs'),
    ('Zancada con Giro de Tronco', 'upper legs'),
    ('Paseo del Granjero (Farmer''s Walk)', 'waist'),
    ('Paseo del Granjero Unilateral (Suitcase Walk)', 'waist'),
    ('Cargada con Barra de Trampa (Hex Bar Carry)', 'upper legs')
)
insert into public.exercises (name, body_part_id)
select d.name, bp.id
from data d
left join public.bodyparts bp on bp.name = d.body_part_key
on conflict (lower(name)) do nothing;

commit;

-- ==========================================================================
-- [08] 20260709140000_exercise_catalog_remove_old.sql   (from hokage-coaching-app)
-- ==========================================================================
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

-- ==========================================================================
-- [09] 20260709150000_profile_goal.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Adds the user's training/nutrition objective to profiles. Drives both the
-- AI workout-plan generator (exercise selection, rep ranges, rest periods)
-- and the calorie recommendation (deficit/surplus vs. maintenance).
-- Run in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

alter table public.profiles
  add column if not exists goal text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_goal_check') then
    alter table public.profiles
      add constraint profiles_goal_check check (goal in ('lose_weight', 'gain_muscle', 'maintain'));
  end if;
end $$;

comment on column public.profiles.goal is
  'Training/nutrition objective: lose_weight | gain_muscle | maintain. Null = not set.';

-- ==========================================================================
-- [10] 20260710120000_body_measurements.sql   (from hokage-coaching-app)
-- ==========================================================================
-- P1 · Body-measurement history
-- profiles.weight_kg is overwritten on every update, so there is no trend to
-- chart. This table keeps one row per user per day; a trigger mirrors any
-- profiles.weight_kg change into today's row so the existing profile/weight
-- flows keep working with no code change, and the progress dashboard's weight
-- card gains real history.

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(4,1),
  thigh_cm numeric(5,1),
  created_at timestamptz default now() not null,
  unique (user_id, measured_on)
);

create index if not exists idx_body_measurements_user_date
  on public.body_measurements (user_id, measured_on);

alter table public.body_measurements enable row level security;

create policy "Users can view own measurements"
  on public.body_measurements for select
  using (auth.uid() = user_id);

create policy "Users can create own measurements"
  on public.body_measurements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own measurements"
  on public.body_measurements for update
  using (auth.uid() = user_id);

create policy "Users can delete own measurements"
  on public.body_measurements for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.body_measurements to authenticated;

-- Optional target for the goal-aware weight card (nullable; unused until set).
alter table public.profiles add column if not exists target_weight_kg numeric(5,2);

-- Mirror profiles.weight_kg → today's body_measurements row on any change.
create or replace function public.sync_weight_measurement()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.weight_kg is not null
     and new.weight_kg is distinct from old.weight_kg then
    insert into public.body_measurements (user_id, measured_on, weight_kg)
    values (new.id, current_date, new.weight_kg)
    on conflict (user_id, measured_on)
    do update set weight_kg = excluded.weight_kg;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_weight_change on public.profiles;
create trigger on_profile_weight_change
  after update of weight_kg on public.profiles
  for each row execute function public.sync_weight_measurement();

-- Backfill one row per user from the current profiles.weight_kg snapshot.
insert into public.body_measurements (user_id, measured_on, weight_kg)
select id, current_date, weight_kg
from public.profiles
where weight_kg is not null
on conflict (user_id, measured_on) do nothing;

-- ==========================================================================
-- [11] 20260716120000_routine_source.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Routine provenance. Three creation paths exist but only the coach one was
-- recorded (assigned_by): AI-generated and hand-made routines were
-- indistinguishable. `source` records it explicitly:
--   'user'  — created by the client in the app
--   'ai'    — generated by the in-app AI plan generator
--   'coach' — assigned through the admin panel
alter table public.routines
  add column if not exists source text not null default 'user'
    check (source in ('user', 'ai', 'coach'));

-- Backfill: coach rows are identifiable by assigned_by. Historic AI rows
-- can't be told apart from manual ones — they stay 'user'.
update public.routines set source = 'coach' where assigned_by is not null;

-- Keep the column honest without touching the admin panel: any writer that
-- sets assigned_by gets source forced to 'coach'.
create or replace function public.sync_routine_source()
returns trigger
language plpgsql
as $$
begin
  if new.assigned_by is not null then
    new.source := 'coach';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_routines_sync_source on public.routines;
create trigger trg_routines_sync_source
  before insert or update on public.routines
  for each row execute function public.sync_routine_source();

-- ==========================================================================
-- [12] 20260717120000_coach_programs.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coach Programs: multi-week periodized training blocks (see
-- docs/COACH-PROGRAMS-SPEC.md). Represents what a coach hands a client today
-- as a PDF — a program spanning N weeks, with named days, per-exercise
-- prescriptions (sets x rep-range, RIR, %1RM, per-side, tempo, rest) that a
-- GLOBAL weekly table modulates (RIR/%load per week + deload).
--
-- Read-only to clients; the (future) Admin Web Panel and the coach role CRUD
-- these. Reuses the single-coach model from 20260707120000_coaching_platform
-- (is_coach(), client-self-scoped, assigned = read-only).
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql  (the user applies SQL there,
-- not via `supabase db push`).
-- ==========================================================================

begin;

-- 1) programs — the block ---------------------------------------------------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,   -- client
  assigned_by uuid references public.profiles(id) on delete set null,       -- coach
  source text not null default 'coach' check (source in ('coach')),
  name text not null,
  description text,
  focus text,                              -- e.g. "Glúteos y Piernas"
  duration_weeks int not null default 1 check (duration_weeks between 1 and 52),
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  progression_rule text,                   -- e.g. double-progression description
  tempo_default text,                      -- e.g. "Excéntrica 2-3s / concéntrica explosiva"
  notes text,                              -- e.g. "Cardio 20 min postworkout"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_programs_user     on public.programs(user_id);
create index if not exists idx_programs_assigned  on public.programs(assigned_by);

-- 2) program_days — the split (Día 1 / Lunes) -------------------------------
create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_index int not null,                  -- 1..N within the program
  label text,                              -- e.g. "Pecho + Bíceps"
  weekday text check (weekday in
    ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (program_id, day_index)
);
create index if not exists idx_program_days_program on public.program_days(program_id);

-- 3) program_exercises — the base prescription ------------------------------
--    exercise_id references the shared catalog; custom_name is the fallback
--    when a coach movement isn't catalogued (no video/body-part for those).
create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete restrict,
  custom_name text,
  sets int not null default 3 check (sets between 1 and 20),
  rep_min int check (rep_min between 1 and 100),
  rep_max int check (rep_max between 1 and 100),
  is_unilateral boolean not null default false,   -- reps are per-side
  rir_min int check (rir_min between 0 and 10),
  rir_max int check (rir_max between 0 and 10),
  load_pct_1rm int check (load_pct_1rm between 1 and 100),
  load_qualitative text check (load_qualitative in ('light','moderate','heavy')),
  tempo text,
  rest_seconds int check (rest_seconds between 0 and 900),
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  -- Must identify the movement one way or the other.
  constraint program_exercise_has_name check (exercise_id is not null or custom_name is not null),
  -- If both bounds given, keep them ordered.
  constraint program_exercise_rep_order check (rep_min is null or rep_max is null or rep_min <= rep_max),
  constraint program_exercise_rir_order check (rir_min is null or rir_max is null or rir_min <= rir_max)
);
create index if not exists idx_program_exercises_day on public.program_exercises(program_day_id);

-- 4) program_weeks — the GLOBAL periodization table -------------------------
--    Both sample PDFs periodize globally (one weekly RIR/%load table), not
--    per exercise. Per-exercise per-week overrides are a documented P2.
create table if not exists public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  week_number int not null,                -- 1..duration_weeks
  label text,                              -- e.g. "Base técnica", "Descarga"
  rir_min int check (rir_min between 0 and 10),
  rir_max int check (rir_max between 0 and 10),
  load_pct_min int check (load_pct_min between 1 and 100),
  load_pct_max int check (load_pct_max between 1 and 100),
  is_deload boolean not null default false,
  sets_override int check (sets_override between 1 and 20),  -- deload drops sets
  notes text,
  created_at timestamptz not null default now(),
  unique (program_id, week_number)
);
create index if not exists idx_program_weeks_program on public.program_weeks(program_id);

-- 5) workout_set_logs — the client's actuals per prescribed set -------------
create table if not exists public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  week_number int not null,
  date date not null default current_date,
  set_index int not null,                  -- 1-based
  weight_kg numeric,                       -- storage is always kg
  reps int check (reps between 0 and 100),
  rir int check (rir between 0 and 10),
  created_at timestamptz not null default now()
);
create index if not exists idx_set_logs_user     on public.workout_set_logs(user_id);
create index if not exists idx_set_logs_exercise  on public.workout_set_logs(program_exercise_id);
create index if not exists idx_set_logs_user_date on public.workout_set_logs(user_id, date);

-- 6) start_date may not be in the past (API writers only) -------------------
--    Mirrors guard_role_change: block only authenticated end-user writes;
--    direct DB / SQL-editor seeds (auth.uid() null) and the service role are
--    exempt so fixtures can set any start_date.
create or replace function public.guard_program_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.start_date < current_date
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'program start_date cannot be in the past';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_program_start_date on public.programs;
create trigger trg_guard_program_start_date
  before insert or update on public.programs
  for each row execute function public.guard_program_start_date();

-- 7) RLS --------------------------------------------------------------------
alter table public.programs          enable row level security;
alter table public.program_days      enable row level security;
alter table public.program_exercises enable row level security;
alter table public.program_weeks     enable row level security;
alter table public.workout_set_logs  enable row level security;

-- Coach: full access to everything (single-coach model).
drop policy if exists "coach all programs" on public.programs;
create policy "coach all programs" on public.programs for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all program_days" on public.program_days;
create policy "coach all program_days" on public.program_days for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all program_exercises" on public.program_exercises;
create policy "coach all program_exercises" on public.program_exercises for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all program_weeks" on public.program_weeks;
create policy "coach all program_weeks" on public.program_weeks for all
  using (public.is_coach()) with check (public.is_coach());

-- Client: read-only on their own program (no insert/update/delete).
drop policy if exists "client reads own programs" on public.programs;
create policy "client reads own programs" on public.programs for select
  using (user_id = auth.uid());
drop policy if exists "client reads own program_days" on public.program_days;
create policy "client reads own program_days" on public.program_days for select
  using (exists (select 1 from public.programs p
                 where p.id = program_id and p.user_id = auth.uid()));
drop policy if exists "client reads own program_exercises" on public.program_exercises;
create policy "client reads own program_exercises" on public.program_exercises for select
  using (exists (select 1 from public.program_days d
                 join public.programs p on p.id = d.program_id
                 where d.id = program_day_id and p.user_id = auth.uid()));
drop policy if exists "client reads own program_weeks" on public.program_weeks;
create policy "client reads own program_weeks" on public.program_weeks for select
  using (exists (select 1 from public.programs p
                 where p.id = program_id and p.user_id = auth.uid()));

-- Set logs: the client owns their actuals; the coach can read all.
drop policy if exists "client manages own set logs" on public.workout_set_logs;
create policy "client manages own set logs" on public.workout_set_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "coach reads all set logs" on public.workout_set_logs;
create policy "coach reads all set logs" on public.workout_set_logs for select
  using (public.is_coach());

-- 8) Grants -----------------------------------------------------------------
grant select, insert, update, delete on public.programs          to authenticated;
grant select, insert, update, delete on public.program_days      to authenticated;
grant select, insert, update, delete on public.program_exercises to authenticated;
grant select, insert, update, delete on public.program_weeks     to authenticated;
grant select, insert, update, delete on public.workout_set_logs  to authenticated;

commit;

-- ==========================================================================
-- [13] 20260717120100_coach_programs_catalog_topup.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Catalog top-up for Coach Programs (docs/COACH-PROGRAMS-SPEC.md, P0-6).
--
-- The 220-exercise seed (20260709130000) already covers ~90% of the sample
-- PDFs. These are the movements it was missing, surfaced when reproducing
-- samples/RUTINA DE ENTRENAMIENTO.pdf and
-- samples/Rutina_Hipertrofia_Gluteos_Piernas_5_Semanas.pdf.
--
-- Additive and safe to re-run: relies on the unique lower(name) index from
-- 20260708120000, so already-present names are skipped. Run in the Supabase
-- SQL editor: https://supabase.com/dashboard/project/_/sql
-- ==========================================================================

begin;

with data(name, body_part_key) as (
  values
    ('Pullover en Polea', 'back'),                       -- sample 1, Día 2
    ('Step-up con Mancuerna', 'upper legs'),             -- sample 2, jueves
    ('Press de Hombro con Mancuernas', 'shoulders'),     -- sample 2, viernes (overhead press mancuernas)
    ('Abducción de Cadera con Banda Elástica', 'upper legs') -- sample 2, sábado (abducción en banda)
)
insert into public.exercises (name, body_part_id)
select d.name, bp.id
from data d
left join public.bodyparts bp on bp.name = d.body_part_key
on conflict (lower(name)) do nothing;

commit;

-- ==========================================================================
-- [14] 20260717130000_program_exercise_completions.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coach Programs — Phase 3 completion tracking (docs/COACH-PROGRAMS-SPEC.md).
--
-- One row = "the client finished this prescribed exercise in this week". The
-- checkbox writes/removes it; a day is done when every exercise in it has a
-- row for the viewed week. Per-set actuals live separately in
-- workout_set_logs (already created in 20260717120000) — logging all sets can
-- auto-insert the completion, but the checkbox alone is enough.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

create table if not exists public.program_exercise_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  week_number int not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- One completion per exercise per week per client.
  unique (user_id, program_exercise_id, week_number)
);
create index if not exists idx_prog_completions_user
  on public.program_exercise_completions(user_id);
create index if not exists idx_prog_completions_exercise
  on public.program_exercise_completions(program_exercise_id);

alter table public.program_exercise_completions enable row level security;

drop policy if exists "client manages own completions" on public.program_exercise_completions;
create policy "client manages own completions" on public.program_exercise_completions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "coach reads all completions" on public.program_exercise_completions;
create policy "coach reads all completions" on public.program_exercise_completions for select
  using (public.is_coach());

grant select, insert, update, delete on public.program_exercise_completions to authenticated;

commit;

-- ==========================================================================
-- [15] 20260717140000_body_measurements_coach_read.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- GAP 1 fix (docs/COACH-ADMIN-PANEL-PRD.md §7): let the coach READ every
-- client's body measurements. The original table (20260710120000) only has
-- self-scoped policies, so the coach — and therefore the future Admin Web
-- Panel's tracking view — cannot see client weight/composition history.
--
-- Single-coach model: is_coach() is true only for the one gym-owner account.
-- Read-only for the coach (clients still own their own writes) — mirrors the
-- "coach reads all set logs / completions" policies.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

drop policy if exists "coach reads all measurements" on public.body_measurements;
create policy "coach reads all measurements" on public.body_measurements for select
  using (public.is_coach());

commit;

-- ==========================================================================
-- [16] 20260717150000_profiles_email_sync.sql   (from hokage-coaching-app)
-- ==========================================================================
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

-- ==========================================================================
-- [17] 20260717150100_memberships_one_per_client.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coach Admin Panel prerequisite: the panel treats "membership" as a single
-- record per client (status/plan/price/dates it edits in place), matching
-- the mobile app's own reads. Without a unique constraint on client_id,
-- `.upsert({ client_id, ... })` from the panel would INSERT a new row every
-- save (upsert conflicts on the PK by default, not client_id) instead of
-- updating the existing one — silently piling up duplicate membership rows.
--
-- This also lets PostgREST infer memberships as a TO-ONE relationship from
-- `profiles`, so `.select('*, membership:memberships(*)')` embeds a single
-- object instead of an array.
--
-- Safe to run once (dev-stage data): if a client already has more than one
-- membership row, this constraint will fail to apply — resolve duplicates
-- first (keep the newest, delete the rest) before re-running.
-- ==========================================================================

begin;

alter table public.memberships
  add constraint memberships_client_id_key unique (client_id);

commit;

-- ==========================================================================
-- [18] 20260720120000_save_coach_routine_rpc.sql   (from hokage-coaching-app)
-- ==========================================================================
-- Transactional coach-routine write (assign + edit) in one round trip.
--
-- The Admin Web Panel previously assigned/edited routines with TWO separate
-- browser calls (insert routine, then insert exercises; or update header,
-- delete exercises, insert new ones). With no transaction, a failure on the
-- second call could leave a routine with no exercises — the edit path had no
-- compensation at all. This RPC does the whole thing inside one function body,
-- which Postgres runs as a single transaction: any error rolls the lot back.
--
-- SECURITY INVOKER (the default): every statement still runs under the
-- caller's RLS. The coaching-platform policies are all `is_coach() OR …`, so a
-- coach passes them exactly as the old browser path did — no new privilege.
-- p_routine_id NULL  -> assign a new coach routine
-- p_routine_id set   -> rewrite that routine's header + exercise list

create or replace function public.save_coach_routine(
  p_routine_id   uuid,
  p_client_id    uuid,
  p_name         text,
  p_description  text,
  p_day_of_week  text,
  p_exercises    jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_routine_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign routines' using errcode = '42501';
  end if;

  if p_routine_id is null then
    insert into public.routines (user_id, assigned_by, source, name, description, day_of_week)
    values (p_client_id, auth.uid(), 'coach', p_name, p_description, p_day_of_week)
    returning id into v_routine_id;
  else
    update public.routines
       set name        = p_name,
           description = p_description,
           day_of_week = p_day_of_week
     where id = p_routine_id
    returning id into v_routine_id;

    if v_routine_id is null then
      raise exception 'Routine % not found', p_routine_id using errcode = 'no_data_found';
    end if;

    -- Replace the exercise list wholesale (routine_exercises has no identity
    -- worth preserving; the app orders by sort_order).
    delete from public.routine_exercises where routine_id = v_routine_id;
  end if;

  insert into public.routine_exercises
    (routine_id, user_id, exercise_id, sets, reps, weight_kg, rest_seconds, sort_order, notes)
  select
    v_routine_id,
    p_client_id,
    (e->>'exercise_id')::uuid,
    (e->>'sets')::int,
    (e->>'reps')::int,
    nullif(e->>'weight_kg', '')::numeric,
    (e->>'rest_seconds')::int,
    (e->>'sort_order')::int,
    nullif(e->>'notes', '')
  from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) as e;

  return v_routine_id;
end;
$$;

-- Only signed-in coaches call this (the body re-checks is_coach()).
revoke all     on function public.save_coach_routine(uuid, uuid, text, text, text, jsonb) from public;
grant  execute on function public.save_coach_routine(uuid, uuid, text, text, text, jsonb) to authenticated;

-- ==========================================================================
-- [19] 20260720130000_save_coach_program_rpc.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Transactional coach-PROGRAM write (create + full rewrite) in one round trip,
-- for the Admin Web Panel's program authoring. A program is a 4-level graph
-- (program → days → exercises, plus a global weekly periodization table); the
-- browser can't write it atomically across several calls, so this RPC does the
-- whole thing inside one function body = one transaction. Mirrors
-- save_coach_routine (20260720120000) one level deeper.
--
-- SECURITY INVOKER: every statement runs under the caller's RLS. The coach
-- programs policies are all is_coach(), so a coach passes exactly as a direct
-- write would — no new privilege. The body also re-checks is_coach().
--
-- p_program_id NULL  -> create a new program
-- p_program_id set   -> rewrite its header + all days/exercises/weeks
--
-- Apply in the Supabase SQL editor (the user applies SQL there, not db push).
-- ==========================================================================

begin;

-- Allow editing a program that has ALREADY started. The original guard
-- (20260717120000) rejects any authenticated write where start_date <
-- current_date. That's correct for a NEW start_date, but it also blocks every
-- edit of a running block (whose start is legitimately in the past), because
-- an UPDATE's NEW row still carries the old past start_date. Only enforce on
-- INSERT or when start_date actually changes.
create or replace function public.guard_program_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.start_date < current_date
     and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date)
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'program start_date cannot be in the past';
  end if;
  return new;
end;
$$;

create or replace function public.save_coach_program(
  p_program_id uuid,
  p_client_id  uuid,
  p_header     jsonb,   -- {name, description, focus, duration_weeks, start_date, status, progression_rule, tempo_default, notes}
  p_days       jsonb,   -- [{day_index, label, weekday, sort_order, exercises: [ {exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral, rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order} ]}]
  p_weeks      jsonb    -- [{week_number, label, rir_min, rir_max, load_pct_min, load_pct_max, is_deload, sets_override, notes}]
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_program_id uuid;
  v_day        jsonb;
  v_day_id     uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage programs' using errcode = '42501';
  end if;

  if p_program_id is null then
    insert into public.programs
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, progression_rule, tempo_default, notes)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       coalesce((p_header->>'duration_weeks')::int, 1),
       coalesce((p_header->>'start_date')::date, current_date),
       coalesce(nullif(p_header->>'status', ''), 'active'),
       nullif(p_header->>'progression_rule', ''),
       nullif(p_header->>'tempo_default', ''),
       nullif(p_header->>'notes', ''))
    returning id into v_program_id;
  else
    update public.programs set
       name             = p_header->>'name',
       description      = nullif(p_header->>'description', ''),
       focus            = nullif(p_header->>'focus', ''),
       duration_weeks   = coalesce((p_header->>'duration_weeks')::int, 1),
       start_date       = coalesce((p_header->>'start_date')::date, start_date),
       status           = coalesce(nullif(p_header->>'status', ''), 'active'),
       progression_rule = nullif(p_header->>'progression_rule', ''),
       tempo_default    = nullif(p_header->>'tempo_default', ''),
       notes            = nullif(p_header->>'notes', ''),
       updated_at       = now()
     where id = p_program_id
    returning id into v_program_id;

    if v_program_id is null then
      raise exception 'Program % not found', p_program_id using errcode = 'no_data_found';
    end if;

    -- Replace children wholesale. program_exercises cascade off program_days.
    delete from public.program_days  where program_id = v_program_id;
    delete from public.program_weeks where program_id = v_program_id;
  end if;

  -- Days, each with its exercises.
  for v_day in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    insert into public.program_days (program_id, day_index, label, weekday, sort_order)
    values (v_program_id,
        (v_day->>'day_index')::int,
        nullif(v_day->>'label', ''),
        nullif(v_day->>'weekday', ''),
        coalesce((v_day->>'sort_order')::int, 0))
    returning id into v_day_id;

    insert into public.program_exercises
      (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral,
       rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order)
    select v_day_id,
        nullif(e->>'exercise_id', '')::uuid,
        nullif(e->>'custom_name', ''),
        coalesce((e->>'sets')::int, 3),
        nullif(e->>'rep_min', '')::int,
        nullif(e->>'rep_max', '')::int,
        coalesce((e->>'is_unilateral')::boolean, false),
        nullif(e->>'rir_min', '')::int,
        nullif(e->>'rir_max', '')::int,
        nullif(e->>'load_pct_1rm', '')::int,
        nullif(e->>'load_qualitative', ''),
        nullif(e->>'tempo', ''),
        nullif(e->>'rest_seconds', '')::int,
        nullif(e->>'notes', ''),
        coalesce((e->>'sort_order')::int, 0)
    from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb)) as e;
  end loop;

  -- Global weekly periodization table.
  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max,
     is_deload, sets_override, notes)
  select v_program_id,
      (w->>'week_number')::int,
      nullif(w->>'label', ''),
      nullif(w->>'rir_min', '')::int,
      nullif(w->>'rir_max', '')::int,
      nullif(w->>'load_pct_min', '')::int,
      nullif(w->>'load_pct_max', '')::int,
      coalesce((w->>'is_deload')::boolean, false),
      nullif(w->>'sets_override', '')::int,
      nullif(w->>'notes', '')
  from jsonb_array_elements(coalesce(p_weeks, '[]'::jsonb)) as w;

  return v_program_id;
end;
$$;

revoke all     on function public.save_coach_program(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant  execute on function public.save_coach_program(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

commit;

-- ==========================================================================
-- [20] 20260721120000_exercise_video_urls.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Exercise demo GIFs: sets public.exercises.video_url to the gymvisual demo
-- hosted in the 'exercise-media' public Storage bucket. Generated from the
-- 258-exercise catalog -> GIF mapping (109 distinct GIFs; cue-only
-- variants share their movement's base demo). Matches on lower(name).
-- Re-runnable. Apply in the Supabase SQL editor.
-- ==========================================================================
begin;

update public.exercises e
   set video_url = v.url,
       updated_at = now()
  from (values
    ('Abdominales en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-crunch.gif'),
    ('Abdominales en Suelo (Crunch)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Abdominales Inversos (Reverse Crunch)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/reverse-crunch.gif'),
    ('Abducción de Cadera con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/resistance-band-seated-hip-abduction.gif'),
    ('Abductores en Polea (Cable Hip Abduction)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-hip-abduction.gif'),
    ('Aductores en Polea (Cable Hip Adduction)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-hip-adduction.gif'),
    ('Aperturas con Goma Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-fly.gif'),
    ('Aperturas con Mancuerna a 1 Brazo', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-fly.gif'),
    ('Aperturas en Banco Declinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-decline-fly.gif'),
    ('Aperturas en Banco Inclinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-incline-fly.gif'),
    ('Aperturas en Banco Plano', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-fly.gif'),
    ('Aperturas en Máquina (Peck Deck)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-fly.gif'),
    ('Bicicleta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/run.gif'),
    ('Burpee', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Burpees', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Cargada con Barra de Trampa (Hex Bar Carry)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-clean-and-press.gif'),
    ('Clean (Levantamiento)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-clean-and-press.gif'),
    ('Correr en la cinta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/run.gif'),
    ('Correr en lugar', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/run.gif'),
    ('Cruces en Polea Alta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-decline-fly.gif'),
    ('Cruces en Polea Baja', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-decline-fly.gif'),
    ('Cruces en Polea Media', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-decline-fly.gif'),
    ('Crunches', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Curl de bíceps', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Bíceps con Agarre Cruzado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Bíceps con Agarre Neutro (Martillo)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Bíceps con Agarre Prono (Inverso)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Bíceps con Barra Recta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Bíceps con Barra Z', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/ez-barbell-curl.gif'),
    ('Curl de Bíceps con Goma Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-concentration-curl.gif'),
    ('Curl de Bíceps con Mancuernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-biceps-curl.gif'),
    ('Curl de Bíceps en Banco Scott', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-preacher-curl.gif'),
    ('Curl de Bíceps en Inclinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-incline-curl.gif'),
    ('Curl de Bíceps en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-bicep-curl.gif'),
    ('Curl de Bíceps en Polea (Cable Curl)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-curl.gif'),
    ('Curl de Bíceps en Suspensión (TRX)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Curl de Femoral con Goma Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-lying-leg-curl.gif'),
    ('Curl de Femoral con Mancuerna (entre pies)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-lying-leg-curl.gif'),
    ('Curl de Femoral de Pie (Standing Leg Curl)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/standing-single-leg-curl.gif'),
    ('Curl de Femoral Sentado (Seated Leg Curl)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-leg-curl.gif'),
    ('Curl de Femoral Tumbado (Prone Leg Curl)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-lying-leg-curl.gif'),
    ('Curl de Femoral Unilateral (a 1 Pierna)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/standing-single-leg-curl.gif'),
    ('Curl de Muñeca con Barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-wrist-curl.gif'),
    ('Curl de Muñeca con Mancuerna', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-finger-curls.gif'),
    ('Curl de Muñeca Inverso', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-wrist-curl.gif'),
    ('Dead Bug', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Dips de Tríceps en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-dip.gif'),
    ('Dominadas con Agarre Abierto', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/wide-grip-pull-up.gif'),
    ('Dominadas con Agarre Cerrado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/close-grip-chin-up.gif'),
    ('Dominadas con Agarre Neutro', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Dominadas con Agarre Prono (Front)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Dominadas con Agarre Supino (Rear)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Dominadas con Bajada Lenta (Tempo)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Dominadas con Pausa en el Punto Superior', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Dominadas en Máquina Asistida', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-assisted-chin-up.gif'),
    ('Dragon Flag', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Elevación de Gemelos con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-single-leg-calf-raise.gif'),
    ('Elevación de Gemelos con Déficit', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-standing-calf-raise.gif'),
    ('Elevación de Gemelos de Pie (Standing Calf Raise)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-standing-calf-raise.gif'),
    ('Elevación de Gemelos de Pie a 1 Pierna', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-standing-calf-raise.gif'),
    ('Elevación de Gemelos en Prensa de Piernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Elevación de Gemelos Sentado (Seated Calf Raise)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-calf-raise.gif'),
    ('Elevación de Pierna Lateral (Side-Lying Leg Raise)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/burpee.gif'),
    ('Elevación de Piernas Colgado (Hanging Leg Raise)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-standing-crunch.gif'),
    ('Elevación de Piernas en Banco (Decline Leg Raise)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-standing-crunch.gif'),
    ('Elevaciones de bíceps', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-curl.gif'),
    ('Elevaciones de piernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-standing-crunch.gif'),
    ('Elevaciones de piernas en colgado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-standing-crunch.gif'),
    ('Elevaciones de rodillas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Elevaciones de talones', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-standing-calf-raise.gif'),
    ('Elevaciones Frontales (Deltoides Anterior)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-front-raise.gif'),
    ('Elevaciones laterales', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-lateral-raise.gif'),
    ('Elevaciones Laterales (Deltoides Medio)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-lateral-raise.gif'),
    ('Elevaciones Laterales con Rotación Externa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-lateral-raise.gif'),
    ('Elevaciones Laterales Inclinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-incline-rear-lateral-raise.gif'),
    ('Encogimientos de Hombros (Shrugs)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-shrug.gif'),
    ('Encogimientos Detrás de la Espalda', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-shrug.gif'),
    ('Encogimientos en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-shrug.gif'),
    ('Extensión de Cuádriceps con Bajada Lenta (Tempo)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-leg-extension.gif'),
    ('Extensión de Cuádriceps con Goma Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/resistance-band-leg-extension.gif'),
    ('Extensión de Cuádriceps con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-leg-extension.gif'),
    ('Extensión de Cuádriceps en Máquina Sentado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-leg-extension.gif'),
    ('Extensión de piernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-leg-extension.gif'),
    ('Extensiones de tríceps', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps a 1 Brazo en Polea', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps con Agarre Neutro', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps con Goma', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-side-triceps-extension.gif'),
    ('Extensiones de Tríceps en Banco Inclinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-incline-pushdown.gif'),
    ('Extensiones de Tríceps en Banco Plano (Skull Crusher)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-dip.gif'),
    ('Extensiones de Tríceps en Polea (Pushdown)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps en Polea Invertido', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Extensiones de Tríceps por Encima de la Cabeza', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Face Pull (Deltoides Posterior + Manguito)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-twisting-pull.gif'),
    ('Face Pull con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-twisting-pull.gif'),
    ('Face Pull con Rotación Externa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-twisting-pull.gif'),
    ('Farmer''s Walk', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/farmers-walk.gif'),
    ('Farmer''s Walk (sujeción)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/farmers-walk.gif'),
    ('Flexión de Dedos con Goma', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-wrist-curl.gif'),
    ('Flexiones de brazos', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Fondos Asistidos', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Fondos con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-side-triceps-extension.gif'),
    ('Fondos de tríceps', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Fondos en Anillas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Fondos en Banco (Tríceps)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Fondos en Paralelas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Giro con Cable (Cable Woodchop)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-kneeling-crunch.gif'),
    ('Giros Rusos (Russian Twist)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Glute Bridge (Puente de Glúteo en Suelo)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-glute-bridge.gif'),
    ('Glute Bridge Unilateral', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-glute-bridge.gif'),
    ('Good Morning con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Good Morning con Barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Good Morning con Barra Baja', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Good Morning con Mancuerna (Goblet Style)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Good Morning con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Good Morning con Piernas Separadas (Sumo Good Morning)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-good-morning.gif'),
    ('Hip Thrust con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/resistance-band-hip-thrusts-on-knees-female.gif'),
    ('Hip Thrust con Barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lying-lifting-on-hip.gif'),
    ('Hip Thrust con Mancuerna', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lying-lifting-on-hip.gif'),
    ('Hip Thrust con Pausa en el Punto Superior', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lying-lifting-on-hip.gif'),
    ('Hip Thrust en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lying-lifting-on-hip.gif'),
    ('Hip Thrust Unilateral', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lying-lifting-on-hip.gif'),
    ('Hiperextensiones a 45°', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/hyperextension.gif'),
    ('Hiperextensiones con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/hyperextension.gif'),
    ('Hiperextensiones en Banco (Back Extension)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/hyperextension.gif'),
    ('Hiperextensiones en Suelo (Superman)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/hyperextension.gif'),
    ('Hiperextensiones Unilateral (a 1 pierna)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/hyperextension.gif'),
    ('Jalones a 1 Brazo en Polea', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pulldown.gif'),
    ('Jalones al Pecho en Polea (Front)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pulldown.gif'),
    ('Jalones en Máquina (Lat Pulldown)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-front-pulldown.gif'),
    ('Jalones Tras Nuca en Polea', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pulldown.gif'),
    ('Kettlebell Swing', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/kettlebell-swing.gif'),
    ('L-Sit', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Máquina de Abductores (Abductor Machine)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-hip-abduction.gif'),
    ('Máquina de Aductores (Adductor Machine)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-seated-hip-adduction.gif'),
    ('Nordic Curl (Curl Nórdico)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-lying-leg-curl.gif'),
    ('Nordic Curl Asistido con Banda', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-lying-leg-curl.gif'),
    ('Pallof Press (Prensa Pallof)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Paseo del Granjero (Farmer''s Walk)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/farmers-walk.gif'),
    ('Paseo del Granjero Unilateral (Suitcase Walk)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-single-arm-overhead-carry.gif'),
    ('Patada de Glúteo en 4 Apoyos (Fire Hydrant)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-standing-hip-extension.gif'),
    ('Patada de Glúteo en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-donkey-calf-raise.gif'),
    ('Patada de Glúteo en Polea (Donkey Kick)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-kickback.gif'),
    ('Patada de Tríceps (Kickback)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Peso muerto', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto a 1 Pierna', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-single-leg-deadlift.gif'),
    ('Peso Muerto con Agarre Invertido (Snatch Grip)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso muerto con barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto con Barra de Trampa (Hex Bar DL)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto con Cadena o Banda', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-stiff-leg-deadlift.gif'),
    ('Peso Muerto con Kettlebell (Goblet DL)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso muerto con mancuernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-deadlift.gif'),
    ('Peso Muerto con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso muerto con piernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto con Piernas Extendidas (Romanian con déficit)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto con Piernas Rígidas (Stiff-Leg)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-stiff-leg-deadlift.gif'),
    ('Peso Muerto Convencional', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto Deficitario', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto desde Bloque (Rack Pull)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-deadlift.gif'),
    ('Peso Muerto Invertido (Deficit RDL)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-romanian-deadlift.gif'),
    ('Peso Muerto Rumano (RDL)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-romanian-deadlift.gif'),
    ('Peso Muerto Sumo', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-sumo-deadlift.gif'),
    ('Pistol Squat (Sentadilla a 1 Pierna)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/single-leg-squat-pistol-male.gif'),
    ('Plancha', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Plancha (Plank)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Plancha con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-bicycle-crunch.gif'),
    ('Prensa de hombros', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Prensa de piernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Prensa de Piernas con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Prensa de Piernas Horizontal', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Prensa de Piernas Inclinada (45°)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Prensa de Piernas Unilateral', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sled-45-leg-press.gif'),
    ('Press Arnold', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press de banca', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Banca con Agarre Abierto', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-wide-bench-press.gif'),
    ('Press de Banca con Agarre Cerrado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-close-grip-bench-press.gif'),
    ('Press de Banca con Bajada Lenta (Tempo 3-1-1)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Banca con Mancuerna en Rotación Neutra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-bench-press.gif'),
    ('Press de Banca con Pausa en Pecho', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Banca Declinado', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-decline-bench-press.gif'),
    ('Press de Banca en Máquina Guiada', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/smith-bench-press.gif'),
    ('Press de Banca en Suelo (Floor Press)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Banca Inclinado (45°)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-bench-press.gif'),
    ('Press de Banca Plano', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Banca Unilateral', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-press.gif'),
    ('Press de Hombro a 1 Brazo', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press de Hombro con Agarre Neutro', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press de Hombro con Bajada Detrás de la Cabeza', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press de Hombro con Mancuernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-arnold-press.gif'),
    ('Press de Hombro con Pausa en la Cabeza', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press de Hombro en Máquina', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-military-press.gif'),
    ('Press de hombros', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Press Militar (por encima de la cabeza)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-seated-behind-head-military-press.gif'),
    ('Pullover en Polea', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-lying-extension-pullover-with-rope-attachment.gif'),
    ('Remo a dos manos', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bent-over-row.gif'),
    ('Remo al Mentón (Upright Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-upright-row.gif'),
    ('Remo al Mentón con Agarre Ancho', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-wide-grip-upright-row.gif'),
    ('Remo al Mentón con Agarre Estrecho', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-upright-row.gif'),
    ('Remo con barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo con Barra de Trampa (Hex Bar Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo con Barra Z (agarre en pronación)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo con Mancuerna a 1 Mano (One-Arm Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-incline-row.gif'),
    ('Remo con Mancuerna a 2 Manos', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-incline-row.gif'),
    ('Remo en Máquina Convergente', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-high-row.gif'),
    ('Remo en Máquina Sentado (Cable Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-seated-row.gif'),
    ('Remo en Polea Baja con Agarre Abierto', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-seated-wide-grip-row.gif'),
    ('Remo en Polea Baja con Agarre Supino', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-seated-row.gif'),
    ('Remo Gironda (V-Bar Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bent-over-row.gif'),
    ('Remo Inclinado con Bajada Excéntrica Lenta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo Inclinado con Barra (Barbell Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo Inclinado con Barra en T (T-Bar Row)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Remo Inclinado con Pausa en el Pecho', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-incline-row.gif'),
    ('Rodillo de Muñeca (Wrist Roller)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-wrist-curl.gif'),
    ('Rueda Abdominal (Ab Wheel Rollout)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/crunch-floor.gif'),
    ('Russian twists', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-russian-twists-on-stability-ball.gif'),
    ('Saltos de Gemelos (Pliométricos)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lever-standing-calf-raise.gif'),
    ('Saltos de tijera', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/jack-jump-male.gif'),
    ('Sentadilla Búlgara (Búlgar Split Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/suspended-split-squat.gif'),
    ('Sentadilla Búlgara con Pausa', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadilla con Apoyo en Pared (Wall Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadilla con Bajada Lenta (Tempo 4-1-1)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadilla con Banda Elástica', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/band-squat.gif'),
    ('Sentadilla con Barra de Trampa (Hex Bar Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-squat.gif'),
    ('Sentadilla con Cadenas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadilla con Mancuernas a los Lados', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-squat.gif'),
    ('Sentadilla con Pausa en el Punto Bajo', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadilla con Pierna Adelantada (Split Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/suspended-split-squat.gif'),
    ('Sentadilla con Salto (Jump Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/jump-squat.gif'),
    ('Sentadilla en Máquina Hack', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-hack-squat.gif'),
    ('Sentadilla en Máquina Multipower', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/smith-squat.gif'),
    ('Sentadilla en Máquina Smith', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/smith-squat.gif'),
    ('Sentadilla Frontal', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-front-squat.gif'),
    ('Sentadilla Goblet (Copa)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-goblet-squat.gif'),
    ('Sentadilla Sissy (Sissy Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sissy-squat.gif'),
    ('Sentadilla Trasera con Barra Alta', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-squat.gif'),
    ('Sentadilla Trasera con Barra Baja', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-squat.gif'),
    ('Sentadilla Zercher', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-zercher-squat.gif'),
    ('Sentadillas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Sentadillas con barra', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-bench-squat.gif'),
    ('Sentadillas con mancuernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-squat.gif'),
    ('Sissy Squat (Sentadilla Sissy)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/sissy-squat.gif'),
    ('Snatch (Arrancada)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-clean-and-press.gif'),
    ('Step-up con Mancuerna', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-step-up.gif'),
    ('Suitcase Carry (Carga Maletero)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/farmers-walk.gif'),
    ('Sujeción con Pinza (Plate Pinch)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/farmers-walk.gif'),
    ('Thruster (Sentadilla + Press)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-full-squat.gif'),
    ('Tríceps con cuerda', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/cable-pushdown.gif'),
    ('Tríceps con mancuernas', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-decline-triceps-extension.gif'),
    ('Vuelos Posteriores (Deltoides Posterior)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/dumbbell-lateral-raise.gif'),
    ('Zancada Caminando (Walking Lunge)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/walking-lunge.gif'),
    ('Zancada con Desplazamiento Lateral (Skater Squat)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada con Giro de Tronco', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada con Pausa en el Punto Bajo', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada con Pierna Elevada Trasera (Búlgaro)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada con Salto (Jump Lunge)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/lunge-with-jump.gif'),
    ('Zancada Cruzada (Curtsy Lunge)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada Hacia Atrás (Reverse Lunge)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif'),
    ('Zancada Lateral (Side Lunge)', 'https://rzgwkwxskrovxnnymxqo.supabase.co/storage/v1/object/public/exercise-media/barbell-lunge.gif')
  ) as v(name, url)
 where lower(e.name) = lower(v.name);

commit;

-- Verify (expect ~258 set, 0 nulls among catalog names):
-- select count(*) filter (where video_url is not null) as with_video,
--        count(*) filter (where video_url is null)     as without_video
-- from public.exercises;

-- ==========================================================================
-- [21] 20260721130000_single_active_program.sql   (from hokage-coaching-app)
-- ==========================================================================
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

-- ==========================================================================
-- [22] 20260722120000_solo_account_type.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Solo app coexistence on the SHARED database.
--
-- The users-only ("solo") app is a separate codebase but points at THIS same
-- Supabase project. Both apps' users live in one `profiles` table, so a solo
-- self-serve signup would otherwise appear in the coach's client list (which
-- lists every profile with role = 'user'). This flag separates them:
--   'coached' — created / managed by the coach via the Admin Web Panel
--   'solo'    — self-registered in the users-only app
--
-- The coach panel lists only 'coached'. The solo app self-tags its own profile
-- 'solo' right after signup (RLS self-update). Adding the NOT NULL column with a
-- default backfills every existing row to 'coached' in one shot — no data step.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.profiles
  add column if not exists account_type text not null default 'coached'
    check (account_type in ('coached', 'solo'));

comment on column public.profiles.account_type is
  'coached = coach-managed (admin panel); solo = self-serve users-only app. Panel lists only coached; solo app self-tags after signup.';

commit;

-- ==========================================================================
-- [23] 20260723120000_exercise_instructions.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Exercise catalog step-by-step instructions (English + Spanish).
-- Sourced from the gymvisual dataset, joined to the catalog via the GIF mapping
-- (258 exercises). Variants that share a base movement get the base
-- movement's steps. jsonb arrays of strings; render as a numbered list.
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.exercises add column if not exists instructions_en jsonb;
alter table public.exercises add column if not exists instructions_es jsonb;

update public.exercises e set
  instructions_en = v.en::jsonb,
  instructions_es = v.es::jsonb,
  updated_at = now()
from (values
  ('Abdominales en Máquina', '["Sit on the leverage machine with your back against the pad and your feet flat on the floor.","Grasp the handles or place your hands on the side pads for support.","Engage your abs and slowly lean back, allowing the pad to move with you.","Once your upper body is at a 45-degree angle, contract your abs and crunch forward, bringing your chest towards your knees.","Pause for a moment at the top, then slowly release and return to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en la máquina de palanca con la espalda apoyada en la almohadilla y los pies planos en el suelo.","Sujeta las asas o coloca las manos sobre las almohadillas laterales para mayor apoyo.","Activa el abdomen e inclínate lentamente hacia atrás, dejando que la almohadilla se mueva contigo.","Cuando la parte superior del cuerpo esté en un ángulo de 45 grados, contrae el abdomen y haz un crunch hacia adelante, llevando el pecho hacia las rodillas.","Haz una pausa breve en lo alto, luego suelta lentamente y vuelve a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Abdominales en Suelo (Crunch)', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Abdominales Inversos (Reverse Crunch)', '["Lie flat on your back with your arms extended along your sides.","Bend your knees and lift your feet off the ground, bringing your thighs perpendicular to the floor.","Contract your abs and curl your hips off the floor, bringing your knees towards your chest.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba con los brazos extendidos a los lados del cuerpo.","Flexiona las rodillas y levanta los pies del suelo, llevando los muslos perpendiculares al suelo.","Contrae el abdomen y eleva las caderas del suelo, llevando las rodillas hacia el pecho.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Abducción de Cadera con Banda Elástica', '["Sit on a chair or bench with your back straight and feet flat on the ground.","Wrap the resistance band around your thighs, just above your knees.","Place your hands on the sides of the chair or bench for support.","Engage your abductors (outer thigh muscles) and slowly push your knees apart, against the resistance of the band.","Pause for a moment at the end of the movement, then slowly bring your knees back together.","Repeat for the desired number of repetitions."]', '["Siéntate en una silla o banco con la espalda recta y los pies apoyados en el suelo.","Envuelve la banda elástica alrededor de los muslos, justo por encima de las rodillas.","Coloca las manos en los lados de la silla o el banco para mayor apoyo.","Activa los abductores (los músculos externos del muslo) y empuja lentamente las rodillas hacia afuera, contra la resistencia de la banda.","Haz una pausa al final del movimiento y luego junta lentamente las rodillas de nuevo.","Repite el número de repeticiones deseado."]'),
  ('Abductores en Polea (Cable Hip Abduction)', '["Adjust the seat height so that your knees are at a 90-degree angle.","Sit on the machine with your back against the backrest and your feet on the footrests.","Place your hands on the side handles for stability.","Engage your abductors and slowly push your legs apart, away from the midline of your body.","Pause for a moment at the end of the movement, then slowly bring your legs back together to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento de modo que tus rodillas formen un ángulo de 90 grados.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre los apoyapiés.","Coloca las manos en las asas laterales para mayor estabilidad.","Activa los abductores y empuja lentamente las piernas hacia afuera, alejándolas de la línea media del cuerpo.","Haz una pausa al final del movimiento y luego junta lentamente las piernas de nuevo hasta la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aductores en Polea (Cable Hip Adduction)', '["Attach the ankle cuff to your ankle and stand facing the cable machine.","Position yourself far enough away from the machine so that there is tension on the cable.","Place your hands on the machine for support.","Keeping your leg straight, slowly move your leg across your body towards the midline.","Pause for a moment at the end of the movement, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta el manguito de tobillo a tu tobillo y ponte de pie frente a la máquina de cable.","Colócate lo suficientemente alejado de la máquina para que haya tensión en el cable.","Coloca las manos sobre la máquina para apoyarte.","Manteniendo la pierna recta, mueve lentamente la pierna por delante del cuerpo hacia la línea media.","Haz una pausa por un momento al final del movimiento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas con Goma Elástica', '["Lie flat on a bench with a dumbbell in each hand, palms facing each other.","Extend your arms straight up over your chest, with a slight bend in your elbows.","Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.","Pause for a moment, then reverse the movement and bring the dumbbells back up to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con una mancuerna en cada mano, con las palmas enfrentadas entre sí.","Extiende los brazos rectos hacia arriba sobre el pecho, con una ligera flexión en los codos.","Manteniendo una ligera flexión en los codos, baja los brazos hacia los lados en un amplio arco hasta sentir un estiramiento en el pecho.","Haz una pausa por un momento, luego invierte el movimiento y lleva las mancuernas de nuevo hacia arriba hasta la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas con Mancuerna a 1 Brazo', '["Lie flat on a bench with a dumbbell in each hand, palms facing each other.","Extend your arms straight up over your chest, with a slight bend in your elbows.","Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.","Pause for a moment, then reverse the movement and bring the dumbbells back up to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con una mancuerna en cada mano, con las palmas enfrentadas entre sí.","Extiende los brazos rectos hacia arriba sobre el pecho, con una ligera flexión en los codos.","Manteniendo una ligera flexión en los codos, baja los brazos hacia los lados en un amplio arco hasta sentir un estiramiento en el pecho.","Haz una pausa por un momento, luego invierte el movimiento y lleva las mancuernas de nuevo hacia arriba hasta la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas en Banco Declinado', '["Adjust the cable machine to a decline position.","Stand facing away from the machine with your feet shoulder-width apart.","Hold the handles with your palms facing forward and your arms extended straight out in front of you.","Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.","Pause for a moment at the fully extended position, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de cable a una posición declinada.","Ponte de pie de espaldas a la máquina con los pies separados a la altura de los hombros.","Sujeta las agarraderas con las palmas hacia adelante y los brazos extendidos rectos frente a ti.","Manteniendo una ligera flexión en los codos, abre los brazos hacia los lados con un movimiento controlado.","Haz una pausa breve en la posición completamente extendida, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas en Banco Inclinado', '["Adjust the cable machine to a low position and attach the handles.","Sit on an incline bench with your back against the pad and feet flat on the floor.","Grasp the handles with an overhand grip and extend your arms straight out in front of you.","Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.","Pause for a moment at the fully extended position, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de cable a una posición baja y sujeta las agarraderas.","Siéntate en un banco inclinado con la espalda apoyada en el respaldo y los pies planos en el suelo.","Sujeta las agarraderas con un agarre prono y extiende los brazos rectos frente a ti.","Manteniendo una ligera flexión en los codos, abre los brazos hacia los lados con un movimiento controlado.","Haz una pausa breve en la posición completamente extendida, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas en Banco Plano', '["Lie flat on a bench with a dumbbell in each hand, palms facing each other.","Extend your arms straight up over your chest, with a slight bend in your elbows.","Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.","Pause for a moment, then reverse the movement and bring the dumbbells back up to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con una mancuerna en cada mano, con las palmas enfrentadas entre sí.","Extiende los brazos rectos hacia arriba sobre el pecho, con una ligera flexión en los codos.","Manteniendo una ligera flexión en los codos, baja los brazos hacia los lados en un amplio arco hasta sentir un estiramiento en el pecho.","Haz una pausa por un momento, luego invierte el movimiento y lleva las mancuernas de nuevo hacia arriba hasta la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Aperturas en Máquina (Peck Deck)', '["Adjust the seat height and position yourself on the machine with your back against the pad.","Grasp the handles with a pronated grip and keep your elbows slightly bent.","Exhale and push the handles forward, bringing them together in front of your chest.","Pause for a moment, squeezing your chest muscles.","Inhale and slowly return to the starting position, allowing your chest muscles to stretch.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina con la espalda apoyada en la almohadilla.","Agarra las asas con un agarre pronado y mantén los codos ligeramente flexionados.","Exhala y empuja las asas hacia adelante, juntándolas frente a tu pecho.","Haz una pausa por un momento, contrayendo los músculos del pecho.","Inhala y vuelve lentamente a la posición inicial, permitiendo que los músculos del pecho se estiren.","Repite el número de repeticiones deseado."]'),
  ('Bicicleta', '["Start by standing upright with your feet hip-width apart.","Engage your core and keep your upper body relaxed.","Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.","Maintain a steady pace and continue jogging for the desired duration or distance.","Remember to breathe deeply and maintain good posture throughout the exercise."]', '["Comienza de pie con los pies separados a la altura de la cadera.","Activa el core y mantén la parte superior del cuerpo relajada.","Comienza a trotar en el lugar, levantando las rodillas hacia el pecho y aterrizando suavemente sobre la punta de los pies.","Mantén un ritmo constante y continúa trotando durante la duración o distancia deseada.","Recuerda respirar profundamente y mantener una buena postura durante todo el ejercicio."]'),
  ('Burpee', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Burpees', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Cargada con Barra de Trampa (Hex Bar Carry)', '["Stand with your feet shoulder-width apart and the barbell on the floor in front of you.","Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body.","As the barbell reaches your thighs, explosively extend your hips, shrug your shoulders, and pull the barbell up towards your chest.","As the barbell reaches chest height, quickly drop under it and catch it at shoulder level, with your elbows pointing forward and your palms facing up.","From the catch position, press the barbell overhead by extending your arms and pushing the barbell straight up.","Lower the barbell back down to the starting position and repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar y agarrar la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Empuja con los talones y extiende las caderas y las rodillas para levantar la barra del suelo, manteniéndola cerca del cuerpo.","Cuando la barra llegue a los muslos, extiende las caderas de forma explosiva, encoge los hombros y tira de la barra hacia el pecho.","Cuando la barra llegue a la altura del pecho, baja rápidamente debajo de ella y atrápala a la altura de los hombros, con los codos apuntando hacia delante y las palmas hacia arriba.","Desde la posición de recepción, empuja la barra por encima de la cabeza extendiendo los brazos y llevando la barra recta hacia arriba.","Baja la barra de vuelta a la posición inicial y repite el número de repeticiones deseado."]'),
  ('Clean (Levantamiento)', '["Stand with your feet shoulder-width apart and the barbell on the floor in front of you.","Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body.","As the barbell reaches your thighs, explosively extend your hips, shrug your shoulders, and pull the barbell up towards your chest.","As the barbell reaches chest height, quickly drop under it and catch it at shoulder level, with your elbows pointing forward and your palms facing up.","From the catch position, press the barbell overhead by extending your arms and pushing the barbell straight up.","Lower the barbell back down to the starting position and repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar y agarrar la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Empuja con los talones y extiende las caderas y las rodillas para levantar la barra del suelo, manteniéndola cerca del cuerpo.","Cuando la barra llegue a los muslos, extiende las caderas de forma explosiva, encoge los hombros y tira de la barra hacia el pecho.","Cuando la barra llegue a la altura del pecho, baja rápidamente debajo de ella y atrápala a la altura de los hombros, con los codos apuntando hacia delante y las palmas hacia arriba.","Desde la posición de recepción, empuja la barra por encima de la cabeza extendiendo los brazos y llevando la barra recta hacia arriba.","Baja la barra de vuelta a la posición inicial y repite el número de repeticiones deseado."]'),
  ('Correr en la cinta', '["Start by standing upright with your feet hip-width apart.","Engage your core and keep your upper body relaxed.","Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.","Maintain a steady pace and continue jogging for the desired duration or distance.","Remember to breathe deeply and maintain good posture throughout the exercise."]', '["Comienza de pie con los pies separados a la altura de la cadera.","Activa el core y mantén la parte superior del cuerpo relajada.","Comienza a trotar en el lugar, levantando las rodillas hacia el pecho y aterrizando suavemente sobre la punta de los pies.","Mantén un ritmo constante y continúa trotando durante la duración o distancia deseada.","Recuerda respirar profundamente y mantener una buena postura durante todo el ejercicio."]'),
  ('Correr en lugar', '["Start by standing upright with your feet hip-width apart.","Engage your core and keep your upper body relaxed.","Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.","Maintain a steady pace and continue jogging for the desired duration or distance.","Remember to breathe deeply and maintain good posture throughout the exercise."]', '["Comienza de pie con los pies separados a la altura de la cadera.","Activa el core y mantén la parte superior del cuerpo relajada.","Comienza a trotar en el lugar, levantando las rodillas hacia el pecho y aterrizando suavemente sobre la punta de los pies.","Mantén un ritmo constante y continúa trotando durante la duración o distancia deseada.","Recuerda respirar profundamente y mantener una buena postura durante todo el ejercicio."]'),
  ('Cruces en Polea Alta', '["Adjust the cable machine to a decline position.","Stand facing away from the machine with your feet shoulder-width apart.","Hold the handles with your palms facing forward and your arms extended straight out in front of you.","Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.","Pause for a moment at the fully extended position, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de cable a una posición declinada.","Ponte de pie de espaldas a la máquina con los pies separados a la altura de los hombros.","Sujeta las agarraderas con las palmas hacia adelante y los brazos extendidos rectos frente a ti.","Manteniendo una ligera flexión en los codos, abre los brazos hacia los lados con un movimiento controlado.","Haz una pausa breve en la posición completamente extendida, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Cruces en Polea Baja', '["Adjust the cable machine to a decline position.","Stand facing away from the machine with your feet shoulder-width apart.","Hold the handles with your palms facing forward and your arms extended straight out in front of you.","Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.","Pause for a moment at the fully extended position, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de cable a una posición declinada.","Ponte de pie de espaldas a la máquina con los pies separados a la altura de los hombros.","Sujeta las agarraderas con las palmas hacia adelante y los brazos extendidos rectos frente a ti.","Manteniendo una ligera flexión en los codos, abre los brazos hacia los lados con un movimiento controlado.","Haz una pausa breve en la posición completamente extendida, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Cruces en Polea Media', '["Adjust the cable machine to a decline position.","Stand facing away from the machine with your feet shoulder-width apart.","Hold the handles with your palms facing forward and your arms extended straight out in front of you.","Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.","Pause for a moment at the fully extended position, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de cable a una posición declinada.","Ponte de pie de espaldas a la máquina con los pies separados a la altura de los hombros.","Sujeta las agarraderas con las palmas hacia adelante y los brazos extendidos rectos frente a ti.","Manteniendo una ligera flexión en los codos, abre los brazos hacia los lados con un movimiento controlado.","Haz una pausa breve en la posición completamente extendida, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Crunches', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de bíceps', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Agarre Cruzado', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Agarre Neutro (Martillo)', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Agarre Prono (Inverso)', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Barra Recta', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Barra Z', '["Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip, palms facing up.","Keep your elbows close to your torso and your upper arms stationary throughout the movement.","Exhale as you curl the barbell up towards your shoulders, contracting your biceps.","Pause for a moment at the top, then inhale as you slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén la barra EZ con agarre supino, palmas hacia arriba.","Mantén los codos cerca del torso y los brazos superiores quietos durante todo el movimiento.","Exhala mientras subes la barra hacia los hombros, contrayendo los bíceps.","Haz una pausa breve en la parte más alta, luego inhala mientras bajas lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps con Goma Elástica', '["Sit on a bench or chair with your legs spread apart and your feet flat on the ground.","Hold one end of the band in your hand and step on the other end with your foot on the same side.","Lean forward slightly and rest your elbow on the inside of your thigh, just above the knee.","With your palm facing up, slowly curl your hand towards your shoulder, keeping your upper arm stationary.","Pause for a moment at the top, then slowly lower your hand back down to the starting position.","Repeat for the desired number of repetitions, then switch sides."]', '["Siéntate en un banco o silla con las piernas separadas y los pies apoyados en el suelo.","Sostén un extremo de la banda en la mano y pisa el otro extremo con el pie del mismo lado.","Inclínate ligeramente hacia adelante y apoya el codo en la parte interna del muslo, justo encima de la rodilla.","Con la palma hacia arriba, flexiona lentamente la mano hacia el hombro, manteniendo quieta la parte superior del brazo.","Haz una pausa por un momento en la parte superior, luego baja lentamente la mano de vuelta a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de lado."]'),
  ('Curl de Bíceps con Mancuernas', '["Stand up straight with a dumbbell in each hand, palms facing forward and arms fully extended.","Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.","Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale and slowly begin to lower the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con una mancuerna en cada mano, con las palmas hacia adelante y los brazos completamente extendidos.","Manteniendo los brazos superiores fijos, exhala y levanta el peso mientras contraes los bíceps.","Continúa levantando las pesas hasta que los bíceps estén completamente contraídos y las mancuernas estén a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala y comienza a bajar lentamente las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps en Banco Scott', '["Sit on a preacher bench with your upper arms resting on the pad and your chest against the support.","Grasp the barbell with an underhand grip, slightly wider than shoulder-width apart.","Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.","Pause for a moment at the top, squeezing your biceps.","Inhale and slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco predicador con los brazos superiores apoyados en el cojín y el pecho contra el soporte.","Agarra la barra con un agarre supino, un poco más ancho que la separación de los hombros.","Manteniendo los brazos superiores fijos, exhala y levanta la barra hacia los hombros.","Haz una pausa breve en la parte alta, apretando los bíceps.","Inhala y baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps en Inclinado', '["Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing forward.","Rest your upper arms on the incline bench and let your elbows hang down, fully extending your arms.","Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.","Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale and slowly begin to lower the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta un banco inclinado a un ángulo de 45 grados y siéntate en él con una mancuerna en cada mano, con las palmas hacia adelante.","Apoya los brazos superiores en el banco inclinado y deja que los codos cuelguen hacia abajo, extendiendo completamente los brazos.","Manteniendo los brazos superiores fijos, exhala y levanta el peso mientras contraes los bíceps.","Continúa levantando las mancuernas hasta que los bíceps estén completamente contraídos y las mancuernas estén a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala y comienza a bajar lentamente las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps en Máquina', '["Adjust the seat height and position yourself on the machine with your back against the pad.","Grasp the handles with an underhand grip, palms facing up, and keep your elbows close to your sides.","Exhale and curl the handles upward, contracting your biceps.","Pause for a moment at the top of the movement, squeezing your biceps.","Inhale and slowly lower the handles back to the starting position, fully extending your arms.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina con la espalda apoyada en la almohadilla.","Sujeta las asas con un agarre supino, con las palmas hacia arriba, y mantén los codos cerca de los costados.","Exhala y flexiona las asas hacia arriba, contrayendo los bíceps.","Haz una pausa breve en la parte más alta del movimiento, contrayendo los bíceps.","Inhala y baja lentamente los mangos de vuelta a la posición inicial, extendiendo completamente los brazos.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps en Polea (Cable Curl)', '["Stand facing the cable machine with your feet shoulder-width apart.","Grasp the cable attachment with an underhand grip, palms facing up.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and curl the cable attachment towards your shoulders, contracting your biceps.","Pause for a moment at the top of the movement, squeezing your biceps.","Inhale and slowly lower the cable attachment back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie frente a la máquina de cable con los pies separados a la altura de los hombros.","Sujeta el accesorio del cable con agarre supino, palmas hacia arriba.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y flexiona el accesorio del cable hacia los hombros, contrayendo los bíceps.","Haz una pausa breve en la parte más alta del movimiento, contrayendo los bíceps.","Inhala y baja lentamente el accesorio del cable de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Bíceps en Suspensión (TRX)', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Femoral con Goma Elástica', '["Adjust the machine to fit your body and select the desired weight.","Lie face down on the machine with your legs straight and your heels against the padded lever.","Grasp the handles or the sides of the machine for stability.","Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y selecciona el peso deseado.","Túmbate boca abajo en la máquina con las piernas rectas y los talones contra la palanca acolchada.","Sujeta las asas o los lados de la máquina para mayor estabilidad.","Manteniendo la parte superior del cuerpo inmóvil, exhala y flexiona las piernas hacia arriba tanto como sea posible sin levantar las caderas de la almohadilla.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Femoral con Mancuerna (entre pies)', '["Adjust the machine to fit your body and select the desired weight.","Lie face down on the machine with your legs straight and your heels against the padded lever.","Grasp the handles or the sides of the machine for stability.","Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y selecciona el peso deseado.","Túmbate boca abajo en la máquina con las piernas rectas y los talones contra la palanca acolchada.","Sujeta las asas o los lados de la máquina para mayor estabilidad.","Manteniendo la parte superior del cuerpo inmóvil, exhala y flexiona las piernas hacia arriba tanto como sea posible sin levantar las caderas de la almohadilla.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Femoral de Pie (Standing Leg Curl)', '["Stand with your feet hip-width apart and your hands on your hips.","Shift your weight onto your left leg and lift your right foot off the ground, bending your knee.","Slowly curl your right heel towards your glutes, squeezing your hamstring.","Pause for a moment at the top, then slowly lower your right foot back down to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie con los pies separados a la altura de las caderas y las manos en las caderas.","Traslada tu peso a la pierna izquierda y levanta el pie derecho del suelo, flexionando la rodilla.","Curva lentamente el talón derecho hacia los glúteos, contrayendo el isquiotibial.","Haz una pausa de un momento en la parte superior y luego baja lentamente el pie derecho de nuevo a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Curl de Femoral Sentado (Seated Leg Curl)', '["Adjust the machine to fit your body and sit on it with your back against the backrest.","Place your lower legs under the padded lever, just above your ankles.","Grasp the handles on the sides of the machine for support.","Keeping your upper legs stationary, exhale and curl your legs up as far as possible.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y siéntate en ella con la espalda apoyada en el respaldo.","Coloca la parte baja de las piernas debajo de la palanca acolchada, justo por encima de los tobillos.","Sujeta las asas a los lados de la máquina para mayor apoyo.","Manteniendo la parte superior de las piernas inmóvil, exhala y flexiona las piernas hacia arriba todo lo que puedas.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Femoral Tumbado (Prone Leg Curl)', '["Adjust the machine to fit your body and select the desired weight.","Lie face down on the machine with your legs straight and your heels against the padded lever.","Grasp the handles or the sides of the machine for stability.","Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y selecciona el peso deseado.","Túmbate boca abajo en la máquina con las piernas rectas y los talones contra la palanca acolchada.","Sujeta las asas o los lados de la máquina para mayor estabilidad.","Manteniendo la parte superior del cuerpo inmóvil, exhala y flexiona las piernas hacia arriba tanto como sea posible sin levantar las caderas de la almohadilla.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Femoral Unilateral (a 1 Pierna)', '["Stand with your feet hip-width apart and your hands on your hips.","Shift your weight onto your left leg and lift your right foot off the ground, bending your knee.","Slowly curl your right heel towards your glutes, squeezing your hamstring.","Pause for a moment at the top, then slowly lower your right foot back down to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie con los pies separados a la altura de las caderas y las manos en las caderas.","Traslada tu peso a la pierna izquierda y levanta el pie derecho del suelo, flexionando la rodilla.","Curva lentamente el talón derecho hacia los glúteos, contrayendo el isquiotibial.","Haz una pausa de un momento en la parte superior y luego baja lentamente el pie derecho de nuevo a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Curl de Muñeca con Barra', '["Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, holding a barbell with an underhand grip.","Allow the barbell to roll down to your fingertips, keeping your wrists straight.","Slowly curl the barbell up towards your forearms by flexing your wrists.","Pause for a moment at the top, then slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con los pies planos en el suelo y los antebrazos apoyados sobre los muslos, sujetando una barra con agarre supino.","Deja que la barra ruede hacia las puntas de los dedos, manteniendo las muñecas rectas.","Enrolla lentamente la barra hacia los antebrazos flexionando las muñecas.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Curl de Muñeca con Mancuerna', '["Sit on a bench or chair with your feet flat on the ground and your back straight.","Hold a dumbbell in one hand with an underhand grip, resting your forearm on your thigh, palm facing up.","Allow the dumbbell to roll down to your fingertips, then curl it back up by flexing your fingers.","Repeat for the desired number of repetitions, then switch to the other hand."]', '["Siéntate en un banco o silla con los pies apoyados en el suelo y la espalda recta.","Sostén una mancuerna en una mano con agarre supino, apoyando el antebrazo sobre el muslo, con la palma hacia arriba.","Deja que la mancuerna ruede hacia las puntas de los dedos, luego flexiona los dedos para volver a enrollarla hacia arriba.","Repite el número de repeticiones deseado, luego cambia a la otra mano."]'),
  ('Curl de Muñeca Inverso', '["Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, holding a barbell with an underhand grip.","Allow the barbell to roll down to your fingertips, keeping your wrists straight.","Slowly curl the barbell up towards your forearms by flexing your wrists.","Pause for a moment at the top, then slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con los pies planos en el suelo y los antebrazos apoyados sobre los muslos, sujetando una barra con agarre supino.","Deja que la barra ruede hacia las puntas de los dedos, manteniendo las muñecas rectas.","Enrolla lentamente la barra hacia los antebrazos flexionando las muñecas.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Dead Bug', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Dips de Tríceps en Máquina', '["Adjust the seat height so that your feet are flat on the ground and your knees are at a 90-degree angle.","Grasp the handles of the leverage machine with your palms facing down and your arms fully extended.","Slowly lower your body by bending your elbows until your upper arms are parallel to the ground.","Pause for a moment, then push yourself back up to the starting position by straightening your arms.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento de modo que tus pies queden planos en el suelo y tus rodillas formen un ángulo de 90 grados.","Agarra las asas de la máquina de palanca con las palmas hacia abajo y los brazos completamente extendidos.","Baja lentamente el cuerpo flexionando los codos hasta que tus brazos queden paralelos al suelo.","Haz una pausa breve, luego empújate de nuevo hacia arriba a la posición inicial estirando los brazos.","Repite el número de repeticiones deseado."]'),
  ('Dominadas con Agarre Abierto', '["Hang from a pull-up bar with your palms facing away from you and your hands wider than shoulder-width apart.","Engage your core and squeeze your shoulder blades together.","Pull your body up towards the bar until your chin is above the bar.","Lower your body back down to the starting position with control.","Repeat for the desired number of repetitions."]', '["Cuélgate de una barra de dominadas con las palmas mirando hacia afuera y las manos más separadas que la anchura de los hombros.","Activa el core y junta los omóplatos.","Tira de tu cuerpo hacia arriba en dirección a la barra hasta que tu barbilla quede por encima de la barra.","Baja el cuerpo de nuevo a la posición inicial con control.","Repite el número de repeticiones deseado."]'),
  ('Dominadas con Agarre Cerrado', '["Grab the pull-up bar with your palms facing towards you and your hands shoulder-width apart.","Hang from the bar with your arms fully extended and your feet off the ground.","Engage your back muscles and pull your body up towards the bar, keeping your elbows close to your body.","Continue pulling until your chin is above the bar.","Pause for a moment at the top, then slowly lower your body back down to the starting position.","Repeat for the desired number of repetitions."]', '["Agarra la barra de dominadas con las palmas hacia ti y las manos separadas a la altura de los hombros.","Cuélgate de la barra con los brazos completamente extendidos y los pies fuera del suelo.","Activa los músculos de la espalda y tira de tu cuerpo hacia arriba, hacia la barra, manteniendo los codos cerca del cuerpo.","Continúa subiendo hasta que la barbilla quede por encima de la barra.","Haz una pausa por un momento en la parte superior, luego baja lentamente el cuerpo de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Dominadas con Agarre Neutro', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Dominadas con Agarre Prono (Front)', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Dominadas con Agarre Supino (Rear)', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Dominadas con Bajada Lenta (Tempo)', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Dominadas con Pausa en el Punto Superior', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Dominadas en Máquina Asistida', '["Adjust the leverage machine to your desired resistance level.","Stand on the foot platform and grip the handles with an overhand grip, slightly wider than shoulder-width apart.","Hang with your arms fully extended, keeping your body straight.","Engage your back muscles and pull your body up towards the handles, leading with your chest.","Continue pulling until your chin is above the handles.","Pause for a moment at the top, then slowly lower your body back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de palanca al nivel de resistencia deseado.","Sube a la plataforma para los pies y agarra las agarraderas con un agarre prono, un poco más separadas que el ancho de los hombros.","Cuélgate con los brazos completamente extendidos, manteniendo el cuerpo recto.","Activa los músculos de la espalda y tira del cuerpo hacia arriba en dirección a las asas, liderando con el pecho.","Continúa subiendo hasta que la barbilla quede por encima de las agarraderas.","Haz una pausa por un momento en la parte superior, luego baja lentamente el cuerpo de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Dragon Flag', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Gemelos con Banda Elástica', '["Stand with your feet hip-width apart and place the band around the ball of your left foot.","Hold onto a stable object for balance if needed.","Slowly raise your left heel off the ground, lifting your body weight onto the ball of your foot.","Pause for a moment at the top, then slowly lower your left heel back down to the starting position.","Repeat for the desired number of repetitions, then switch to the right leg."]', '["Ponte de pie con los pies separados a la altura de las caderas y coloca la banda alrededor de la base de los dedos del pie izquierdo.","Sujétate de un objeto estable para mantener el equilibrio si es necesario.","Levanta lentamente el talón izquierdo del suelo, llevando el peso del cuerpo hacia la punta del pie.","Haz una pausa por un momento en la parte superior, luego baja lentamente el talón izquierdo de vuelta a la posición inicial.","Repite el número de repeticiones deseado, luego cambia a la pierna derecha."]'),
  ('Elevación de Gemelos con Déficit', '["Adjust the machine to your height and stand with your feet shoulder-width apart.","Place your shoulders under the pads and hold onto the handles for stability.","Raise your heels as high as possible by extending your ankles.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu altura y ponte de pie con los pies separados a la altura de los hombros.","Coloca los hombros debajo de las almohadillas y sujétate de las asas para mayor estabilidad.","Eleva los talones tan alto como puedas extendiendo los tobillos.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Gemelos de Pie (Standing Calf Raise)', '["Stand with your feet shoulder-width apart and place a barbell across your upper back.","Raise your heels off the ground as high as possible, using only your toes.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y coloca una barra sobre la parte superior de la espalda.","Levanta los talones del suelo lo más alto posible, apoyándote solo en las puntas de los pies.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Gemelos de Pie a 1 Pierna', '["Stand with your feet shoulder-width apart and place a barbell across your upper back.","Raise your heels off the ground as high as possible, using only your toes.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y coloca una barra sobre la parte superior de la espalda.","Levanta los talones del suelo lo más alto posible, apoyándote solo en las puntas de los pies.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Gemelos en Prensa de Piernas', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Gemelos Sentado (Seated Calf Raise)', '["Sit on a bench with your feet flat on the floor and a barbell resting on your thighs.","Place the balls of your feet on a raised platform, such as a block or step.","Lower your heels as far as possible, feeling a stretch in your calves.","Raise your heels as high as possible, contracting your calves.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con los pies planos sobre el suelo y una barra apoyada sobre los muslos.","Coloca la parte delantera de los pies sobre una plataforma elevada, como un bloque o un escalón.","Baja los talones tanto como sea posible, sintiendo un estiramiento en las pantorrillas.","Levanta los talones lo más alto posible, contrayendo las pantorrillas.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Pierna Lateral (Side-Lying Leg Raise)', '["Start in a standing position with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.","Kick your feet back into a push-up position.","Perform a push-up, keeping your body in a straight line.","Jump your feet back into the squat position.","Jump up explosively, reaching your arms overhead.","Land softly and immediately lower back into a squat position to begin the next repetition."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y colocando las manos en el suelo frente a ti.","Lleva los pies hacia atrás de una patada hasta una posición de flexión de brazos.","Realiza una flexión de brazos, manteniendo el cuerpo en línea recta.","Salta con los pies de vuelta a la posición de sentadilla.","Salta hacia arriba explosivamente, llevando los brazos por encima de la cabeza.","Aterriza suavemente y baja de inmediato a una posición de sentadilla para comenzar la siguiente repetición."]'),
  ('Elevación de Piernas Colgado (Hanging Leg Raise)', '["Attach the band to a sturdy anchor point at waist height.","Stand facing away from the anchor point with your feet shoulder-width apart.","Hold the band with both hands and bring it up to your chest, keeping your elbows bent and close to your body.","Engage your abs and slowly crunch forward, bringing your chest towards your knees.","Pause for a moment at the top of the crunch, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta la banda a un punto de anclaje resistente a la altura de la cintura.","Ponte de pie de espaldas al punto de anclaje con los pies separados a la altura de los hombros.","Sostén la banda con ambas manos y llévala hacia el pecho, manteniendo los codos flexionados y cerca del cuerpo.","Activa el abdomen y flexiona lentamente el torso hacia adelante, llevando el pecho hacia las rodillas.","Haz una pausa por un momento en la parte más alta del movimiento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevación de Piernas en Banco (Decline Leg Raise)', '["Attach the band to a sturdy anchor point at waist height.","Stand facing away from the anchor point with your feet shoulder-width apart.","Hold the band with both hands and bring it up to your chest, keeping your elbows bent and close to your body.","Engage your abs and slowly crunch forward, bringing your chest towards your knees.","Pause for a moment at the top of the crunch, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta la banda a un punto de anclaje resistente a la altura de la cintura.","Ponte de pie de espaldas al punto de anclaje con los pies separados a la altura de los hombros.","Sostén la banda con ambas manos y llévala hacia el pecho, manteniendo los codos flexionados y cerca del cuerpo.","Activa el abdomen y flexiona lentamente el torso hacia adelante, llevando el pecho hacia las rodillas.","Haz una pausa por un momento en la parte más alta del movimiento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones de bíceps', '["Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.","Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.","Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.","Hold the contracted position for a brief pause as you squeeze your biceps.","Inhale as you slowly begin to lower the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.","Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.","Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.","Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.","Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones de piernas', '["Attach the band to a sturdy anchor point at waist height.","Stand facing away from the anchor point with your feet shoulder-width apart.","Hold the band with both hands and bring it up to your chest, keeping your elbows bent and close to your body.","Engage your abs and slowly crunch forward, bringing your chest towards your knees.","Pause for a moment at the top of the crunch, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta la banda a un punto de anclaje resistente a la altura de la cintura.","Ponte de pie de espaldas al punto de anclaje con los pies separados a la altura de los hombros.","Sostén la banda con ambas manos y llévala hacia el pecho, manteniendo los codos flexionados y cerca del cuerpo.","Activa el abdomen y flexiona lentamente el torso hacia adelante, llevando el pecho hacia las rodillas.","Haz una pausa por un momento en la parte más alta del movimiento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones de piernas en colgado', '["Attach the band to a sturdy anchor point at waist height.","Stand facing away from the anchor point with your feet shoulder-width apart.","Hold the band with both hands and bring it up to your chest, keeping your elbows bent and close to your body.","Engage your abs and slowly crunch forward, bringing your chest towards your knees.","Pause for a moment at the top of the crunch, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta la banda a un punto de anclaje resistente a la altura de la cintura.","Ponte de pie de espaldas al punto de anclaje con los pies separados a la altura de los hombros.","Sostén la banda con ambas manos y llévala hacia el pecho, manteniendo los codos flexionados y cerca del cuerpo.","Activa el abdomen y flexiona lentamente el torso hacia adelante, llevando el pecho hacia las rodillas.","Haz una pausa por un momento en la parte más alta del movimiento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones de rodillas', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones de talones', '["Adjust the machine to your height and stand with your feet shoulder-width apart.","Place your shoulders under the pads and hold onto the handles for stability.","Raise your heels as high as possible by extending your ankles.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu altura y ponte de pie con los pies separados a la altura de los hombros.","Coloca los hombros debajo de las almohadillas y sujétate de las asas para mayor estabilidad.","Eleva los talones tan alto como puedas extendiendo los tobillos.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones Frontales (Deltoides Anterior)', '["Stand with your feet shoulder-width apart and hold the band in front of your thighs with your palms facing down.","Keep your arms straight and slowly raise them forward until they are parallel to the ground.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén la banda frente a los muslos con las palmas hacia abajo.","Mantén los brazos rectos y levántalos lentamente hacia adelante hasta que queden paralelos al suelo.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones laterales', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.","Keep your back straight and engage your core.","Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén una mancuerna en cada mano, con las palmas hacia el cuerpo.","Mantén la espalda recta y activa el core.","Levanta los brazos hacia los lados hasta que queden paralelos al suelo, manteniendo una ligera flexión en los codos.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones Laterales (Deltoides Medio)', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.","Keep your back straight and engage your core.","Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén una mancuerna en cada mano, con las palmas hacia el cuerpo.","Mantén la espalda recta y activa el core.","Levanta los brazos hacia los lados hasta que queden paralelos al suelo, manteniendo una ligera flexión en los codos.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones Laterales con Rotación Externa', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.","Keep your back straight and engage your core.","Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén una mancuerna en cada mano, con las palmas hacia el cuerpo.","Mantén la espalda recta y activa el core.","Levanta los brazos hacia los lados hasta que queden paralelos al suelo, manteniendo una ligera flexión en los codos.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Elevaciones Laterales Inclinado', '["Set up an incline bench at a 45-degree angle.","Sit on the bench with your chest against the backrest and hold a dumbbell in each hand.","Extend your arms straight down with your palms facing each other.","Keeping a slight bend in your elbows, raise your arms out to the sides until they are parallel to the ground.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Siéntate en el banco con el pecho contra el respaldo y sostén una mancuerna en cada mano.","Extiende los brazos rectos hacia abajo con las palmas enfrentadas entre sí.","Manteniendo una ligera flexión en los codos, levanta los brazos hacia los lados hasta que queden paralelos al suelo.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Encogimientos de Hombros (Shrugs)', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body.","Keep your arms straight and let the dumbbells hang by your sides.","Raise your shoulders as high as possible, as if you are trying to touch your ears with your shoulders.","Hold the contraction for a second, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una mancuerna en cada mano con las palmas hacia tu cuerpo.","Mantén los brazos rectos y deja que las mancuernas cuelguen a tus costados.","Eleva los hombros lo más alto posible, como si intentaras tocarte las orejas con ellos.","Mantén la contracción durante un segundo, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Encogimientos Detrás de la Espalda', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body.","Keep your arms straight and let the dumbbells hang by your sides.","Raise your shoulders as high as possible, as if you are trying to touch your ears with your shoulders.","Hold the contraction for a second, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una mancuerna en cada mano con las palmas hacia tu cuerpo.","Mantén los brazos rectos y deja que las mancuernas cuelguen a tus costados.","Eleva los hombros lo más alto posible, como si intentaras tocarte las orejas con ellos.","Mantén la contracción durante un segundo, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Encogimientos en Máquina', '["Adjust the seat height and position yourself on the leverage machine with your back against the pad.","Grasp the handles with an overhand grip and keep your arms straight.","Keeping your back straight, lift your shoulders up towards your ears as high as possible.","Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina de palanca con la espalda apoyada en la almohadilla.","Sujeta las asas con un agarre prono y mantén los brazos rectos.","Manteniendo la espalda recta, eleva los hombros hacia las orejas tan alto como sea posible.","Mantén la contracción por un momento, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensión de Cuádriceps con Bajada Lenta (Tempo)', '["Adjust the seat height and backrest of the machine to fit your body.","Sit on the machine with your back against the backrest and your feet on the footpad.","Grasp the handles or sidebars for stability.","Extend your legs forward by straightening your knees, lifting the weight.","Pause for a moment at the top, then slowly lower the weight back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y el respaldo de la máquina a tu cuerpo.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre la almohadilla para los pies.","Sujeta las asas o las barras laterales para mayor estabilidad.","Extiende las piernas hacia adelante enderezando las rodillas, levantando el peso.","Haz una pausa breve en lo alto, luego baja lentamente el peso de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensión de Cuádriceps con Goma Elástica', '["Attach the resistance band to a sturdy anchor point and secure it around your ankle.","Stand facing the anchor point with your feet shoulder-width apart.","Keeping your core engaged and your upper body stable, extend your leg straight out in front of you.","Pause for a moment at the top, then slowly return your leg to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Sujeta la banda elástica a un punto de anclaje firme y asegúrala alrededor de tu tobillo.","Ponte de pie frente al punto de anclaje con los pies separados a la altura de los hombros.","Manteniendo el core activado y la parte superior del cuerpo estable, extiende la pierna recta frente a ti.","Haz una pausa por un momento en la parte alta y luego vuelve lentamente la pierna a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Extensión de Cuádriceps con Pausa', '["Adjust the seat height and backrest of the machine to fit your body.","Sit on the machine with your back against the backrest and your feet on the footpad.","Grasp the handles or sidebars for stability.","Extend your legs forward by straightening your knees, lifting the weight.","Pause for a moment at the top, then slowly lower the weight back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y el respaldo de la máquina a tu cuerpo.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre la almohadilla para los pies.","Sujeta las asas o las barras laterales para mayor estabilidad.","Extiende las piernas hacia adelante enderezando las rodillas, levantando el peso.","Haz una pausa breve en lo alto, luego baja lentamente el peso de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensión de Cuádriceps en Máquina Sentado', '["Adjust the seat height and backrest of the machine to fit your body.","Sit on the machine with your back against the backrest and your feet on the footpad.","Grasp the handles or sidebars for stability.","Extend your legs forward by straightening your knees, lifting the weight.","Pause for a moment at the top, then slowly lower the weight back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y el respaldo de la máquina a tu cuerpo.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre la almohadilla para los pies.","Sujeta las asas o las barras laterales para mayor estabilidad.","Extiende las piernas hacia adelante enderezando las rodillas, levantando el peso.","Haz una pausa breve en lo alto, luego baja lentamente el peso de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensión de piernas', '["Adjust the seat height and backrest of the machine to fit your body.","Sit on the machine with your back against the backrest and your feet on the footpad.","Grasp the handles or sidebars for stability.","Extend your legs forward by straightening your knees, lifting the weight.","Pause for a moment at the top, then slowly lower the weight back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y el respaldo de la máquina a tu cuerpo.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre la almohadilla para los pies.","Sujeta las asas o las barras laterales para mayor estabilidad.","Extiende las piernas hacia adelante enderezando las rodillas, levantando el peso.","Haz una pausa breve en lo alto, luego baja lentamente el peso de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de tríceps', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps a 1 Brazo en Polea', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps con Agarre Neutro', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps con Goma', '["Stand with your feet shoulder-width apart and hold the band with both hands, palms facing down.","Extend your arms straight out to the sides, keeping them parallel to the ground.","Slowly bend your elbows and bring your hands towards your shoulders, keeping your upper arms still.","Pause for a moment, then slowly extend your arms back out to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén la banda con ambas manos, con las palmas hacia abajo.","Extiende los brazos hacia los lados, manteniéndolos paralelos al suelo.","Flexiona lentamente los codos y lleva las manos hacia los hombros, manteniendo quieta la parte superior de los brazos.","Haz una pausa por un momento, luego extiende lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps en Banco Inclinado', '["Attach a straight bar to a high pulley cable machine.","Stand facing away from the machine with your feet shoulder-width apart.","Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.","Lean forward slightly and keep your back straight.","Pull the bar down towards your thighs by extending your elbows.","Pause for a moment at the bottom, then slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie de espaldas a la máquina con los pies separados a la altura de los hombros.","Sujeta la barra con un agarre prono, con las manos un poco más separadas que el ancho de los hombros.","Inclínate ligeramente hacia adelante y mantén la espalda recta.","Jala la barra hacia abajo en dirección a tus muslos extendiendo los codos.","Haz una pausa por un momento en la parte baja y luego regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps en Banco Plano (Skull Crusher)', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps en Máquina', '["Adjust the seat height so that your feet are flat on the ground and your knees are at a 90-degree angle.","Grasp the handles of the leverage machine with your palms facing down and your arms fully extended.","Slowly lower your body by bending your elbows until your upper arms are parallel to the ground.","Pause for a moment, then push yourself back up to the starting position by straightening your arms.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento de modo que tus pies queden planos en el suelo y tus rodillas formen un ángulo de 90 grados.","Agarra las asas de la máquina de palanca con las palmas hacia abajo y los brazos completamente extendidos.","Baja lentamente el cuerpo flexionando los codos hasta que tus brazos queden paralelos al suelo.","Haz una pausa breve, luego empújate de nuevo hacia arriba a la posición inicial estirando los brazos.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps en Polea (Pushdown)', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps en Polea Invertido', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Extensiones de Tríceps por Encima de la Cabeza', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Face Pull (Deltoides Posterior + Manguito)', '["Attach a cable handle to a low pulley and stand facing the machine.","Grasp the handle with your left hand and step away from the machine, extending your arm fully.","Position your feet shoulder-width apart, with your knees slightly bent.","Keep your back straight and your core engaged throughout the exercise.","Pull the handle towards your body, rotating your torso to the right as you do so.","Squeeze your back muscles at the end of the movement.","Slowly return to the starting position, keeping tension on the cable.","Repeat for the desired number of repetitions, then switch sides and perform with your right hand."]', '["Coloca un mango de cable en una polea baja y ponte de pie frente a la máquina.","Agarra el mango con la mano izquierda y aléjate de la máquina, extendiendo completamente el brazo.","Coloca los pies separados a la altura de los hombros, con las rodillas ligeramente flexionadas.","Mantén la espalda recta y el core activado durante todo el ejercicio.","Tira del mango hacia tu cuerpo, rotando el torso hacia la derecha al hacerlo.","Aprieta los músculos de la espalda al final del movimiento.","Regresa lentamente a la posición inicial, manteniendo la tensión en el cable.","Repite el número de repeticiones deseado, luego cambia de lado y realiza el ejercicio con la mano derecha."]'),
  ('Face Pull con Pausa', '["Attach a cable handle to a low pulley and stand facing the machine.","Grasp the handle with your left hand and step away from the machine, extending your arm fully.","Position your feet shoulder-width apart, with your knees slightly bent.","Keep your back straight and your core engaged throughout the exercise.","Pull the handle towards your body, rotating your torso to the right as you do so.","Squeeze your back muscles at the end of the movement.","Slowly return to the starting position, keeping tension on the cable.","Repeat for the desired number of repetitions, then switch sides and perform with your right hand."]', '["Coloca un mango de cable en una polea baja y ponte de pie frente a la máquina.","Agarra el mango con la mano izquierda y aléjate de la máquina, extendiendo completamente el brazo.","Coloca los pies separados a la altura de los hombros, con las rodillas ligeramente flexionadas.","Mantén la espalda recta y el core activado durante todo el ejercicio.","Tira del mango hacia tu cuerpo, rotando el torso hacia la derecha al hacerlo.","Aprieta los músculos de la espalda al final del movimiento.","Regresa lentamente a la posición inicial, manteniendo la tensión en el cable.","Repite el número de repeticiones deseado, luego cambia de lado y realiza el ejercicio con la mano derecha."]'),
  ('Face Pull con Rotación Externa', '["Attach a cable handle to a low pulley and stand facing the machine.","Grasp the handle with your left hand and step away from the machine, extending your arm fully.","Position your feet shoulder-width apart, with your knees slightly bent.","Keep your back straight and your core engaged throughout the exercise.","Pull the handle towards your body, rotating your torso to the right as you do so.","Squeeze your back muscles at the end of the movement.","Slowly return to the starting position, keeping tension on the cable.","Repeat for the desired number of repetitions, then switch sides and perform with your right hand."]', '["Coloca un mango de cable en una polea baja y ponte de pie frente a la máquina.","Agarra el mango con la mano izquierda y aléjate de la máquina, extendiendo completamente el brazo.","Coloca los pies separados a la altura de los hombros, con las rodillas ligeramente flexionadas.","Mantén la espalda recta y el core activado durante todo el ejercicio.","Tira del mango hacia tu cuerpo, rotando el torso hacia la derecha al hacerlo.","Aprieta los músculos de la espalda al final del movimiento.","Regresa lentamente a la posición inicial, manteniendo la tensión en el cable.","Repite el número de repeticiones deseado, luego cambia de lado y realiza el ejercicio con la mano derecha."]'),
  ('Farmer''s Walk', '["Stand up straight with a dumbbell in each hand, palms facing your sides.","Keep your back straight and your shoulders back.","Take small, controlled steps forward, maintaining an upright posture.","Continue walking for the desired distance or time.","To finish, stop walking and carefully lower the dumbbells to your sides."]', '["Ponte de pie con una mancuerna en cada mano, palmas hacia los costados.","Mantén la espalda recta y los hombros hacia atrás.","Da pasos pequeños y controlados hacia adelante, manteniendo una postura erguida.","Continúa caminando durante la distancia o el tiempo deseado.","Para terminar, deja de caminar y baja con cuidado las mancuernas a los costados."]'),
  ('Farmer''s Walk (sujeción)', '["Stand up straight with a dumbbell in each hand, palms facing your sides.","Keep your back straight and your shoulders back.","Take small, controlled steps forward, maintaining an upright posture.","Continue walking for the desired distance or time.","To finish, stop walking and carefully lower the dumbbells to your sides."]', '["Ponte de pie con una mancuerna en cada mano, palmas hacia los costados.","Mantén la espalda recta y los hombros hacia atrás.","Da pasos pequeños y controlados hacia adelante, manteniendo una postura erguida.","Continúa caminando durante la distancia o el tiempo deseado.","Para terminar, deja de caminar y baja con cuidado las mancuernas a los costados."]'),
  ('Flexión de Dedos con Goma', '["Sit on a bench or chair with your feet flat on the ground.","Hold the band with both hands, palms facing up, and rest your forearms on your thighs.","Slowly curl your wrists upward, squeezing your forearms.","Pause for a moment at the top, then slowly lower your wrists back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco o silla con los pies apoyados en el suelo.","Sujeta la banda con ambas manos, con las palmas hacia arriba, y apoya los antebrazos sobre los muslos.","Flexiona lentamente las muñecas hacia arriba, apretando los antebrazos.","Haz una pausa por un momento en la parte superior, luego baja lentamente las muñecas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Flexiones de brazos', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos Asistidos', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos con Banda Elástica', '["Stand with your feet shoulder-width apart and hold the band with both hands, palms facing down.","Extend your arms straight out to the sides, keeping them parallel to the ground.","Slowly bend your elbows and bring your hands towards your shoulders, keeping your upper arms still.","Pause for a moment, then slowly extend your arms back out to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén la banda con ambas manos, con las palmas hacia abajo.","Extiende los brazos hacia los lados, manteniéndolos paralelos al suelo.","Flexiona lentamente los codos y lleva las manos hacia los hombros, manteniendo quieta la parte superior de los brazos.","Haz una pausa por un momento, luego extiende lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos de tríceps', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos en Anillas', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos en Banco (Tríceps)', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Fondos en Paralelas', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Giro con Cable (Cable Woodchop)', '["Attach a rope handle to a high pulley and kneel down facing away from the machine.","Hold the rope handle with both hands and place it behind your head, keeping your elbows out to the sides.","Keeping your hips stationary, flex your waist and crunch your torso down towards your thighs.","Pause for a moment at the bottom, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una agarradera de cuerda a una polea alta y ponte de rodillas de espaldas a la máquina.","Sujeta la agarradera de cuerda con ambas manos y colócala detrás de la cabeza, manteniendo los codos hacia afuera a los lados.","Manteniendo las caderas inmóviles, flexiona la cintura y encoge el torso hacia los muslos.","Haz una pausa por un momento en la parte inferior, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Giros Rusos (Russian Twist)', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Glute Bridge (Puente de Glúteo en Suelo)', '["Start by lying flat on your back on the ground with your knees bent and feet flat on the floor.","Place a barbell across your hips, holding it securely with both hands.","Engage your glutes and core muscles, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, squeezing your glutes.","Slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Empieza tumbado boca arriba en el suelo con las rodillas flexionadas y los pies planos sobre el suelo.","Coloca una barra sobre las caderas, sujetándola con firmeza con ambas manos.","Activa los glúteos y el core, luego levanta las caderas del suelo hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa breve en la parte alta, apretando los glúteos.","Baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Glute Bridge Unilateral', '["Start by lying flat on your back on the ground with your knees bent and feet flat on the floor.","Place a barbell across your hips, holding it securely with both hands.","Engage your glutes and core muscles, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, squeezing your glutes.","Slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Empieza tumbado boca arriba en el suelo con las rodillas flexionadas y los pies planos sobre el suelo.","Coloca una barra sobre las caderas, sujetándola con firmeza con ambas manos.","Activa los glúteos y el core, luego levanta las caderas del suelo hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa breve en la parte alta, apretando los glúteos.","Baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Banda Elástica', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Barra', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Barra Baja', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Mancuerna (Goblet Style)', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Pausa', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Good Morning con Piernas Separadas (Sumo Good Morning)', '["Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.","Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.","Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.","Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y la barra apoyada sobre la parte superior de la espalda.","Manteniendo la espalda recta y el core activado, flexiona las caderas hacia delante, empujando los glúteos hacia atrás como si intentaras tocar la pared detrás de ti con ellos.","Baja el torso hasta que quede paralelo al suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve y luego vuelve a la posición inicial apretando los glúteos y empujando las caderas hacia delante.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust con Banda Elástica', '["Start by kneeling on the ground with your knees hip-width apart and your feet flexed.","Wrap the resistance band around your thighs, just above your knees.","Place your hands on your hips or extend them out in front of you for balance.","Engage your glutes and core muscles.","Push your hips forward and squeeze your glutes as you lift your knees off the ground, extending your hips until your thighs are parallel to the ground.","Hold the position for a moment, then slowly lower your knees back down to the starting position.","Repeat for the desired number of repetitions."]', '["Comienza arrodillándote en el suelo con las rodillas separadas a la altura de las caderas y los pies flexionados.","Envuelve la banda elástica alrededor de los muslos, justo por encima de las rodillas.","Coloca las manos en las caderas o extiéndelas frente a ti para mantener el equilibrio.","Activa los glúteos y los músculos del core.","Empuja las caderas hacia adelante y aprieta los glúteos mientras levantas las rodillas del suelo, extendiendo las caderas hasta que los muslos queden paralelos al suelo.","Mantén la posición por un momento y luego baja lentamente las rodillas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust con Barra', '["Lie flat on your back on a bench with your feet flat on the ground and your knees bent.","Hold the barbell with an overhand grip and position it on your hips.","Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con los pies planos sobre el suelo y las rodillas flexionadas.","Sujeta la barra con un agarre pronado y colócala sobre las caderas.","Activando los glúteos, levanta las caderas del banco hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust con Mancuerna', '["Lie flat on your back on a bench with your feet flat on the ground and your knees bent.","Hold the barbell with an overhand grip and position it on your hips.","Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con los pies planos sobre el suelo y las rodillas flexionadas.","Sujeta la barra con un agarre pronado y colócala sobre las caderas.","Activando los glúteos, levanta las caderas del banco hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust con Pausa en el Punto Superior', '["Lie flat on your back on a bench with your feet flat on the ground and your knees bent.","Hold the barbell with an overhand grip and position it on your hips.","Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con los pies planos sobre el suelo y las rodillas flexionadas.","Sujeta la barra con un agarre pronado y colócala sobre las caderas.","Activando los glúteos, levanta las caderas del banco hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust en Máquina', '["Lie flat on your back on a bench with your feet flat on the ground and your knees bent.","Hold the barbell with an overhand grip and position it on your hips.","Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con los pies planos sobre el suelo y las rodillas flexionadas.","Sujeta la barra con un agarre pronado y colócala sobre las caderas.","Activando los glúteos, levanta las caderas del banco hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hip Thrust Unilateral', '["Lie flat on your back on a bench with your feet flat on the ground and your knees bent.","Hold the barbell with an overhand grip and position it on your hips.","Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.","Pause for a moment at the top, then slowly lower your hips back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate boca arriba en un banco con los pies planos sobre el suelo y las rodillas flexionadas.","Sujeta la barra con un agarre pronado y colócala sobre las caderas.","Activando los glúteos, levanta las caderas del banco hasta que el cuerpo forme una línea recta desde las rodillas hasta los hombros.","Haz una pausa por un momento en la parte superior, luego baja lentamente las caderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Hiperextensiones a 45°', '["Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.","Cross your arms over your chest or place your hands behind your head.","Lower your upper body towards the ground while keeping your back straight.","Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.","Repeat for the desired number of repetitions."]', '["Ajusta el banco de hiperextensiones para que la parte superior de los muslos quede apoyada en la almohadilla y los pies queden asegurados.","Cruza los brazos sobre el pecho o coloca las manos detrás de la cabeza.","Baja la parte superior del cuerpo hacia el suelo manteniendo la espalda recta.","Haz una pausa breve en la parte baja, luego eleva la parte superior del cuerpo hasta que quede alineada con las piernas.","Repite el número de repeticiones deseado."]'),
  ('Hiperextensiones con Pausa', '["Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.","Cross your arms over your chest or place your hands behind your head.","Lower your upper body towards the ground while keeping your back straight.","Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.","Repeat for the desired number of repetitions."]', '["Ajusta el banco de hiperextensiones para que la parte superior de los muslos quede apoyada en la almohadilla y los pies queden asegurados.","Cruza los brazos sobre el pecho o coloca las manos detrás de la cabeza.","Baja la parte superior del cuerpo hacia el suelo manteniendo la espalda recta.","Haz una pausa breve en la parte baja, luego eleva la parte superior del cuerpo hasta que quede alineada con las piernas.","Repite el número de repeticiones deseado."]'),
  ('Hiperextensiones en Banco (Back Extension)', '["Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.","Cross your arms over your chest or place your hands behind your head.","Lower your upper body towards the ground while keeping your back straight.","Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.","Repeat for the desired number of repetitions."]', '["Ajusta el banco de hiperextensiones para que la parte superior de los muslos quede apoyada en la almohadilla y los pies queden asegurados.","Cruza los brazos sobre el pecho o coloca las manos detrás de la cabeza.","Baja la parte superior del cuerpo hacia el suelo manteniendo la espalda recta.","Haz una pausa breve en la parte baja, luego eleva la parte superior del cuerpo hasta que quede alineada con las piernas.","Repite el número de repeticiones deseado."]'),
  ('Hiperextensiones en Suelo (Superman)', '["Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.","Cross your arms over your chest or place your hands behind your head.","Lower your upper body towards the ground while keeping your back straight.","Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.","Repeat for the desired number of repetitions."]', '["Ajusta el banco de hiperextensiones para que la parte superior de los muslos quede apoyada en la almohadilla y los pies queden asegurados.","Cruza los brazos sobre el pecho o coloca las manos detrás de la cabeza.","Baja la parte superior del cuerpo hacia el suelo manteniendo la espalda recta.","Haz una pausa breve en la parte baja, luego eleva la parte superior del cuerpo hasta que quede alineada con las piernas.","Repite el número de repeticiones deseado."]'),
  ('Hiperextensiones Unilateral (a 1 pierna)', '["Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.","Cross your arms over your chest or place your hands behind your head.","Lower your upper body towards the ground while keeping your back straight.","Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.","Repeat for the desired number of repetitions."]', '["Ajusta el banco de hiperextensiones para que la parte superior de los muslos quede apoyada en la almohadilla y los pies queden asegurados.","Cruza los brazos sobre el pecho o coloca las manos detrás de la cabeza.","Baja la parte superior del cuerpo hacia el suelo manteniendo la espalda recta.","Haz una pausa breve en la parte baja, luego eleva la parte superior del cuerpo hasta que quede alineada con las piernas.","Repite el número de repeticiones deseado."]'),
  ('Jalones a 1 Brazo en Polea', '["Adjust the cable pulldown machine so that the seat is at a comfortable height and the knee pad is secured.","Sit on the seat with your back straight and your feet flat on the ground.","Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart.","Lean back slightly and engage your core.","Pull the cable bar down towards your chest, squeezing your shoulder blades together.","Pause for a moment at the bottom of the movement, then slowly release the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de jalón de cable de modo que el asiento quede a una altura cómoda y la almohadilla de rodillas esté asegurada.","Siéntate con la espalda recta y los pies apoyados planos en el suelo.","Sujeta la barra del cable con un agarre prono, un poco más separado que el ancho de los hombros.","Inclínate ligeramente hacia atrás y activa el core.","Jala la barra del cable hacia el pecho, apretando los omóplatos entre sí.","Haz una pausa por un momento en la parte baja del movimiento y luego suelta lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Jalones al Pecho en Polea (Front)', '["Adjust the cable pulldown machine so that the seat is at a comfortable height and the knee pad is secured.","Sit on the seat with your back straight and your feet flat on the ground.","Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart.","Lean back slightly and engage your core.","Pull the cable bar down towards your chest, squeezing your shoulder blades together.","Pause for a moment at the bottom of the movement, then slowly release the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de jalón de cable de modo que el asiento quede a una altura cómoda y la almohadilla de rodillas esté asegurada.","Siéntate con la espalda recta y los pies apoyados planos en el suelo.","Sujeta la barra del cable con un agarre prono, un poco más separado que el ancho de los hombros.","Inclínate ligeramente hacia atrás y activa el core.","Jala la barra del cable hacia el pecho, apretando los omóplatos entre sí.","Haz una pausa por un momento en la parte baja del movimiento y luego suelta lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Jalones en Máquina (Lat Pulldown)', '["Adjust the seat height and position yourself on the machine with your knees under the pads and your feet flat on the ground.","Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.","Sit upright with your chest lifted and your shoulders back, maintaining a slight arch in your lower back.","Engage your lats and pull the handles down towards your chest, squeezing your shoulder blades together.","Pause for a moment at the bottom of the movement, then slowly release the handles back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina con las rodillas debajo de las almohadillas y los pies planos en el suelo.","Agarra las agarraderas con un agarre prono, un poco más separadas que el ancho de los hombros.","Siéntate erguido con el pecho elevado y los hombros hacia atrás, manteniendo un ligero arco en la zona lumbar.","Activa los dorsales y tira de las asas hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte baja del movimiento, luego suelta lentamente las asas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Jalones Tras Nuca en Polea', '["Adjust the cable pulldown machine so that the seat is at a comfortable height and the knee pad is secured.","Sit on the seat with your back straight and your feet flat on the ground.","Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart.","Lean back slightly and engage your core.","Pull the cable bar down towards your chest, squeezing your shoulder blades together.","Pause for a moment at the bottom of the movement, then slowly release the bar back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de jalón de cable de modo que el asiento quede a una altura cómoda y la almohadilla de rodillas esté asegurada.","Siéntate con la espalda recta y los pies apoyados planos en el suelo.","Sujeta la barra del cable con un agarre prono, un poco más separado que el ancho de los hombros.","Inclínate ligeramente hacia atrás y activa el core.","Jala la barra del cable hacia el pecho, apretando los omóplatos entre sí.","Haz una pausa por un momento en la parte baja del movimiento y luego suelta lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Kettlebell Swing', '["Stand with your feet shoulder-width apart, toes pointed slightly outward.","Hold the kettlebell with both hands in front of your body, arms extended.","Bend your knees slightly and hinge at the hips, pushing your butt back.","Swing the kettlebell back between your legs, keeping your arms straight and maintaining a flat back.","Drive your hips forward and swing the kettlebell up to shoulder height, using the momentum generated by your hips.","Allow the kettlebell to swing back down between your legs and repeat the movement for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la pesa rusa con ambas manos frente al cuerpo, con los brazos extendidos.","Flexiona ligeramente las rodillas e inclínate desde las caderas, empujando los glúteos hacia atrás.","Lleva la pesa rusa hacia atrás entre las piernas, manteniendo los brazos rectos y la espalda plana.","Lleva las caderas hacia adelante y haz que la pesa rusa suba hasta la altura del hombro, usando el impulso generado por las caderas.","Deja que la pesa rusa se balancee de vuelta hacia abajo entre las piernas y repite el movimiento el número de repeticiones deseado."]'),
  ('L-Sit', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Máquina de Abductores (Abductor Machine)', '["Adjust the seat height so that your knees are at a 90-degree angle.","Sit on the machine with your back against the backrest and your feet on the footrests.","Place your hands on the side handles for stability.","Engage your abductors and slowly push your legs apart, away from the midline of your body.","Pause for a moment at the end of the movement, then slowly bring your legs back together to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento de modo que tus rodillas formen un ángulo de 90 grados.","Siéntate en la máquina con la espalda apoyada en el respaldo y los pies sobre los apoyapiés.","Coloca las manos en las asas laterales para mayor estabilidad.","Activa los abductores y empuja lentamente las piernas hacia afuera, alejándolas de la línea media del cuerpo.","Haz una pausa al final del movimiento y luego junta lentamente las piernas de nuevo hasta la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Máquina de Aductores (Adductor Machine)', '["Adjust the seat height and position yourself on the machine with your back against the backrest.","Place your feet on the footrests and grasp the handles for stability.","Engage your adductor muscles and slowly bring your legs together, squeezing your inner thighs.","Pause for a moment at the peak contraction, then slowly return to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina con la espalda apoyada en el respaldo.","Coloca los pies sobre los apoyapiés y agarra las asas para mayor estabilidad.","Activa los aductores y junta lentamente las piernas, apretando la parte interna de los muslos.","Haz una pausa breve en el punto máximo de contracción, luego vuelve lentamente a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Nordic Curl (Curl Nórdico)', '["Adjust the machine to fit your body and select the desired weight.","Lie face down on the machine with your legs straight and your heels against the padded lever.","Grasp the handles or the sides of the machine for stability.","Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y selecciona el peso deseado.","Túmbate boca abajo en la máquina con las piernas rectas y los talones contra la palanca acolchada.","Sujeta las asas o los lados de la máquina para mayor estabilidad.","Manteniendo la parte superior del cuerpo inmóvil, exhala y flexiona las piernas hacia arriba tanto como sea posible sin levantar las caderas de la almohadilla.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Nordic Curl Asistido con Banda', '["Adjust the machine to fit your body and select the desired weight.","Lie face down on the machine with your legs straight and your heels against the padded lever.","Grasp the handles or the sides of the machine for stability.","Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.","Hold the contracted position for a brief pause as you squeeze your hamstrings.","Inhale and slowly lower the lever back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu cuerpo y selecciona el peso deseado.","Túmbate boca abajo en la máquina con las piernas rectas y los talones contra la palanca acolchada.","Sujeta las asas o los lados de la máquina para mayor estabilidad.","Manteniendo la parte superior del cuerpo inmóvil, exhala y flexiona las piernas hacia arriba tanto como sea posible sin levantar las caderas de la almohadilla.","Mantén la posición contraída durante una pausa breve mientras aprietas los isquiotibiales.","Inhala y baja lentamente la palanca de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Pallof Press (Prensa Pallof)', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Paseo del Granjero (Farmer''s Walk)', '["Stand up straight with a dumbbell in each hand, palms facing your sides.","Keep your back straight and your shoulders back.","Take small, controlled steps forward, maintaining an upright posture.","Continue walking for the desired distance or time.","To finish, stop walking and carefully lower the dumbbells to your sides."]', '["Ponte de pie con una mancuerna en cada mano, palmas hacia los costados.","Mantén la espalda recta y los hombros hacia atrás.","Da pasos pequeños y controlados hacia adelante, manteniendo una postura erguida.","Continúa caminando durante la distancia o el tiempo deseado.","Para terminar, deja de caminar y baja con cuidado las mancuernas a los costados."]'),
  ('Paseo del Granjero Unilateral (Suitcase Walk)', '["Stand tall with your feet shoulder-width apart, holding a dumbbell in one hand.","Raise the dumbbell overhead, fully extending your arm.","Engage your core and keep your back straight as you walk forward, maintaining the dumbbell overhead.","Continue walking for the desired distance or time.","Switch hands and repeat the exercise."]', '["Ponte de pie con los pies separados a la altura de los hombros, sujetando una mancuerna con una mano.","Levanta la mancuerna por encima de la cabeza, extendiendo completamente el brazo.","Activa el core y mantén la espalda recta mientras caminas hacia adelante, sosteniendo la mancuerna por encima de la cabeza.","Continúa caminando durante la distancia o el tiempo deseado.","Cambia de mano y repite el ejercicio."]'),
  ('Patada de Glúteo en 4 Apoyos (Fire Hydrant)', '["Attach a cable to a low pulley and stand facing away from the machine.","Place the cable around your ankle and stand with your feet shoulder-width apart.","Keep your core engaged and your back straight throughout the exercise.","Slowly extend your leg straight back, squeezing your glutes at the top of the movement.","Pause for a moment, then return to the starting position.","Repeat for the desired number of repetitions.","Switch sides and repeat with the other leg."]', '["Sujeta un cable a una polea baja y ponte de pie de espaldas a la máquina.","Coloca el cable alrededor de tu tobillo y ponte de pie con los pies separados a la altura de los hombros.","Mantén el core activado y la espalda recta durante todo el ejercicio.","Extiende lentamente la pierna hacia atrás, apretando los glúteos en la parte alta del movimiento.","Haz una pausa breve y luego vuelve a la posición inicial.","Repite el número de repeticiones deseado.","Cambia de lado y repite con la otra pierna."]'),
  ('Patada de Glúteo en Máquina', '["Adjust the leverage machine to the appropriate height for your body.","Position yourself facing the machine, with your toes on the foot platform and your heels hanging off the edge.","Place your hands on the handles or the support bars for stability.","Engage your calves and lift your heels as high as possible, using the balls of your feet.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina de palanca a la altura adecuada para tu cuerpo.","Colócate de frente a la máquina, con los dedos de los pies en la plataforma y los talones colgando fuera del borde.","Coloca las manos en las asas o en las barras de soporte para mayor estabilidad.","Activa las pantorrillas y levanta los talones tan alto como sea posible, usando la parte delantera de los pies.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Patada de Glúteo en Polea (Donkey Kick)', '["Stand facing a cable machine with your feet shoulder-width apart.","Hold the cable handle with your right hand and step back to create tension in the cable.","Bend your knees slightly and hinge forward at the hips, keeping your back straight.","Keep your upper arm close to your body and your elbow bent at a 90-degree angle.","Extend your forearm backward, straightening your arm fully.","Pause for a moment, then slowly return to the starting position.","Repeat for the desired number of repetitions, then switch sides."]', '["Ponte de pie frente a una máquina de cable con los pies separados a la altura de los hombros.","Sujeta la agarradera del cable con la mano derecha y retrocede un paso para crear tensión en el cable.","Flexiona ligeramente las rodillas e inclínate hacia adelante desde las caderas, manteniendo la espalda recta.","Mantén la parte superior del brazo cerca del cuerpo y el codo flexionado en un ángulo de 90 grados.","Extiende el antebrazo hacia atrás, enderezando el brazo por completo.","Haz una pausa por un momento, luego regresa lentamente a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de lado."]'),
  ('Patada de Tríceps (Kickback)', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Peso muerto', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto a 1 Pierna', '["Stand with your feet hip-width apart, holding a barbell in front of your thighs with an overhand grip.","Shift your weight onto your left foot and lift your right foot slightly off the ground.","Hinge forward at the hips, keeping your back straight and your right leg extended behind you for balance.","Lower the barbell towards the ground, keeping it close to your body and your left leg slightly bent.","Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your torso back up to the starting position.","Repeat for the desired number of repetitions, then switch sides."]', '["Ponte de pie con los pies separados a la altura de las caderas, sujetando una barra frente a los muslos con agarre prono.","Traslada el peso hacia el pie izquierdo y levanta el pie derecho ligeramente del suelo.","Inclínate hacia adelante desde las caderas, manteniendo la espalda recta y la pierna derecha extendida detrás de ti para el equilibrio.","Baja la barra hacia el suelo, manteniéndola cerca del cuerpo y la pierna izquierda ligeramente flexionada.","Haz una pausa breve en la posición más baja, luego activa los glúteos y los isquiotibiales para levantar el torso de vuelta a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de lado."]'),
  ('Peso Muerto con Agarre Invertido (Snatch Grip)', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso muerto con barra', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Barra de Trampa (Hex Bar DL)', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Cadena o Banda', '["Stand with your feet shoulder-width apart and place the band around your ankles.","Hold the band with both hands in front of your thighs, palms facing your body.","Keeping your back straight and your core engaged, hinge at the hips and slowly lower your upper body towards the ground.","As you lower, push your hips back and allow your knees to bend slightly.","Lower the band towards the ground, feeling a stretch in your hamstrings.","Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your upper body back up to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y coloca la banda alrededor de los tobillos.","Sujeta la banda con ambas manos frente a los muslos, con las palmas mirando hacia el cuerpo.","Manteniendo la espalda recta y el core activado, flexiona las caderas y baja lentamente la parte superior del cuerpo hacia el suelo.","Mientras bajas, empuja las caderas hacia atrás y deja que las rodillas se flexionen ligeramente.","Baja la banda hacia el suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve en la posición baja, luego activa los glúteos y los isquiotibiales para levantar la parte superior del cuerpo de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Kettlebell (Goblet DL)', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso muerto con mancuernas', '["Stand with your feet shoulder-width apart, toes pointing forward.","Hold a dumbbell in each hand, palms facing your body, arms extended downwards.","Bend at your hips and knees, lowering the dumbbells towards the ground while keeping your back straight.","Push through your heels and extend your hips and knees, lifting the dumbbells back up to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con las puntas de los pies apuntando hacia adelante.","Sostén una mancuerna en cada mano, con las palmas hacia el cuerpo y los brazos extendidos hacia abajo.","Flexiona las caderas y las rodillas, bajando las mancuernas hacia el suelo mientras mantienes la espalda recta.","Empuja con los talones y extiende las caderas y las rodillas, levantando las mancuernas de nuevo a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Pausa', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso muerto con piernas', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Piernas Extendidas (Romanian con déficit)', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto con Piernas Rígidas (Stiff-Leg)', '["Stand with your feet shoulder-width apart and place the band around your ankles.","Hold the band with both hands in front of your thighs, palms facing your body.","Keeping your back straight and your core engaged, hinge at the hips and slowly lower your upper body towards the ground.","As you lower, push your hips back and allow your knees to bend slightly.","Lower the band towards the ground, feeling a stretch in your hamstrings.","Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your upper body back up to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y coloca la banda alrededor de los tobillos.","Sujeta la banda con ambas manos frente a los muslos, con las palmas mirando hacia el cuerpo.","Manteniendo la espalda recta y el core activado, flexiona las caderas y baja lentamente la parte superior del cuerpo hacia el suelo.","Mientras bajas, empuja las caderas hacia atrás y deja que las rodillas se flexionen ligeramente.","Baja la banda hacia el suelo, sintiendo un estiramiento en los isquiotibiales.","Haz una pausa breve en la posición baja, luego activa los glúteos y los isquiotibiales para levantar la parte superior del cuerpo de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto Convencional', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto Deficitario', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto desde Bloque (Rack Pull)', '["Stand with your feet shoulder-width apart and the barbell on the ground in front of you.","Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.","As you stand up straight, squeeze your glutes and keep your core engaged.","Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar el torso y agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y el pecho elevado mientras empujas con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas.","Al ponerte de pie, aprieta los glúteos y mantén el core activado.","Baja la barra de vuelta al suelo flexionando las caderas y las rodillas, manteniendo la espalda recta.","Repite el número de repeticiones deseado."]'),
  ('Peso Muerto Invertido (Deficit RDL)', '["Stand with your feet shoulder-width apart and your toes pointing forward.","Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Bend at the hips, keeping your back straight and your knees slightly bent.","Lower the barbell towards the ground, keeping it close to your body.","Feel the stretch in your hamstrings as you lower the barbell.","Once you feel a stretch in your hamstrings, push your hips forward and stand up straight.","Squeeze your glutes at the top of the movement.","Lower the barbell back down to the starting position and repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y los dedos de los pies apuntando hacia delante.","Sujeta la barra con un agarre pronado, manos un poco más separadas que el ancho de los hombros.","Flexiona las caderas, manteniendo la espalda recta y las rodillas ligeramente flexionadas.","Baja la barra hacia el suelo, manteniéndola cerca del cuerpo.","Siente el estiramiento en los isquiotibiales mientras bajas la barra.","Cuando sientas el estiramiento en los isquiotibiales, empuja las caderas hacia delante y ponte de pie.","Aprieta los glúteos en la parte alta del movimiento.","Baja la barra de vuelta a la posición inicial y repite el número de repeticiones deseado."]'),
  ('Peso Muerto Rumano (RDL)', '["Stand with your feet shoulder-width apart and your toes pointing forward.","Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Bend at the hips, keeping your back straight and your knees slightly bent.","Lower the barbell towards the ground, keeping it close to your body.","Feel the stretch in your hamstrings as you lower the barbell.","Once you feel a stretch in your hamstrings, push your hips forward and stand up straight.","Squeeze your glutes at the top of the movement.","Lower the barbell back down to the starting position and repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y los dedos de los pies apuntando hacia delante.","Sujeta la barra con un agarre pronado, manos un poco más separadas que el ancho de los hombros.","Flexiona las caderas, manteniendo la espalda recta y las rodillas ligeramente flexionadas.","Baja la barra hacia el suelo, manteniéndola cerca del cuerpo.","Siente el estiramiento en los isquiotibiales mientras bajas la barra.","Cuando sientas el estiramiento en los isquiotibiales, empuja las caderas hacia delante y ponte de pie.","Aprieta los glúteos en la parte alta del movimiento.","Baja la barra de vuelta a la posición inicial y repite el número de repeticiones deseado."]'),
  ('Peso Muerto Sumo', '["Stand with your feet wider than shoulder-width apart, toes pointing outwards.","Place a barbell on the ground in front of you, centered between your feet.","Bend your knees and lower your hips, keeping your back straight and chest up, to grip the barbell with an overhand grip.","Engage your core and drive through your heels to lift the barbell off the ground, extending your hips and knees simultaneously.","As you lift, keep your chest up and back straight, and push your hips forward to fully engage your glutes.","Pause for a moment at the top, then slowly lower the barbell back down to the starting position, maintaining control throughout the movement.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies más separados que el ancho de los hombros, con las puntas de los pies hacia afuera.","Coloca una barra en el suelo frente a ti, centrada entre los pies.","Flexiona las rodillas y baja las caderas, manteniendo la espalda recta y el pecho elevado, para sujetar la barra con agarre prono.","Activa el core y empuja con los talones para levantar la barra del suelo, extendiendo las caderas y las rodillas simultáneamente.","Al levantar, mantén el pecho elevado y la espalda recta, y empuja las caderas hacia adelante para activar completamente los glúteos.","Haz una pausa breve en la parte más alta, luego baja lentamente la barra de vuelta a la posición inicial, manteniendo el control durante todo el movimiento.","Repite el número de repeticiones deseado."]'),
  ('Pistol Squat (Sentadilla a 1 Pierna)', '["Stand with your feet shoulder-width apart and arms extended in front of you.","Lift your right foot off the ground and extend it forward.","Slowly lower your body down by bending your left knee and pushing your hips back.","Keep your chest up and your back straight as you lower yourself down.","Lower until your left thigh is parallel to the ground, or as low as you can comfortably go.","Pause for a moment at the bottom, then push through your left heel to return to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie con los pies separados a la altura de los hombros y los brazos extendidos frente a ti.","Levanta el pie derecho del suelo y extiéndelo hacia delante.","Baja lentamente el cuerpo doblando la rodilla izquierda y empujando las caderas hacia atrás.","Mantén el pecho elevado y la espalda recta mientras bajas el cuerpo.","Baja hasta que el muslo izquierdo quede paralelo al suelo, o lo más abajo que puedas llegar cómodamente.","Haz una pausa por un momento en la posición baja, luego empuja con el talón izquierdo para volver a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Plancha', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Plancha (Plank)', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Plancha con Banda Elástica', '["Lie flat on your back with your hands behind your head and your knees bent.","Lift your feet off the ground and bring your right knee towards your chest while simultaneously twisting your torso to bring your left elbow towards your right knee.","Straighten your right leg while bringing your left knee towards your chest and twisting your torso to bring your right elbow towards your left knee.","Continue alternating the twisting motion, as if you are pedaling a bicycle, while keeping your core engaged throughout the movement.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las manos detrás de la cabeza y las rodillas flexionadas.","Levanta los pies del suelo y lleva la rodilla derecha hacia el pecho mientras simultáneamente giras el torso para llevar el codo izquierdo hacia la rodilla derecha.","Estira la pierna derecha mientras llevas la rodilla izquierda hacia el pecho y giras el torso para llevar el codo derecho hacia la rodilla izquierda.","Continúa alternando el movimiento de giro, como si estuvieras pedaleando una bicicleta, manteniendo el core activado durante todo el movimiento.","Repite el número de repeticiones deseado."]'),
  ('Prensa de hombros', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Prensa de piernas', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Prensa de Piernas con Pausa', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Prensa de Piernas Horizontal', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Prensa de Piernas Inclinada (45°)', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Prensa de Piernas Unilateral', '["Adjust the seat and footplate of the sled machine to a comfortable position.","Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.","Grip the handles on the sides of the seat for stability.","Push the footplate away from your body by extending your legs, keeping your heels on the footplate.","Continue pushing until your legs are almost fully extended, but without locking your knees.","Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.","Repeat for the desired number of repetitions."]', '["Ajusta el asiento y la placa de la máquina de trineo a una posición cómoda.","Siéntate en la máquina de trineo con la espalda contra el respaldo y los pies separados a la altura de los hombros sobre la placa.","Sujeta las asas a los lados del asiento para mayor estabilidad.","Empuja la placa alejándola de tu cuerpo extendiendo las piernas, manteniendo los talones sobre la placa.","Continúa empujando hasta que las piernas estén casi completamente extendidas, pero sin bloquear las rodillas.","Haz una pausa por un momento en la parte alta del movimiento, luego baja lentamente la placa de vuelta hacia tu cuerpo doblando las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Press Arnold', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de banca', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca con Agarre Abierto', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with a wide grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows slightly flared out.","Pause for a moment when the barbell touches your chest, then push it back up to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre amplio, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos ligeramente abiertos hacia afuera.","Haz una pausa breve cuando la barra toque el pecho y luego empújala de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca con Agarre Cerrado', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.","Unrack the barbell and lower it slowly towards your chest, keeping your elbows close to your body.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position, fully extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre cerrado, un poco más estrecho que el ancho de los hombros.","Saca la barra del soporte y bájala lentamente hacia el pecho, manteniendo los codos cerca del cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial, extendiendo completamente los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca con Bajada Lenta (Tempo 3-1-1)', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca con Mancuerna en Rotación Neutra', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Hold a dumbbell in each hand, with your palms facing forward and your arms extended above your chest.","Lower the dumbbells slowly to the sides of your chest, keeping your elbows at a 90-degree angle.","Pause for a moment, then push the dumbbells back up to the starting position, fully extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Sujeta una mancuerna en cada mano, con las palmas hacia adelante y los brazos extendidos por encima del pecho.","Baja lentamente las mancuernas hacia los lados del pecho, manteniendo los codos en un ángulo de 90 grados.","Haz una pausa breve, luego empuja las mancuernas de vuelta hacia arriba hasta la posición inicial, extendiendo completamente los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca con Pausa en Pecho', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca Declinado', '["Lie on a decline bench with your feet secured and your head lower than your hips.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.","Pause for a moment at the bottom, then push the barbell back up to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate en un banco declinado con los pies sujetos y la cabeza más baja que las caderas.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Saca la barra del soporte y bájala lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve en la parte baja y luego empuja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca en Máquina Guiada', '["Adjust the height of the smith machine bar to chest level.","Lie flat on the bench with your feet firmly planted on the ground.","Grip the bar with an overhand grip slightly wider than shoulder-width apart.","Unrack the bar and lower it towards your chest, keeping your elbows tucked in.","Pause for a moment when the bar touches your chest.","Push the bar back up to the starting position, fully extending your arms.","Repeat for the desired number of repetitions."]', '["Ajusta la altura de la barra de la máquina Smith a la altura del pecho.","Túmbate en el banco con los pies firmemente apoyados en el suelo.","Sujeta la barra con agarre prono, un poco más separado que el ancho de los hombros.","Suelta la barra del soporte y bájala hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa por un momento cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial, extendiendo los brazos por completo.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca en Suelo (Floor Press)', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca Inclinado (45°)', '["Set up an incline bench at a 45-degree angle.","Lie down on the bench with your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Unrack the barbell and lower it slowly towards your chest, keeping your elbows at a 45-degree angle.","Pause for a moment at the bottom, then push the barbell back up to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate en el banco con los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Saca la barra del soporte y bájala lentamente hacia el pecho, manteniendo los codos a un ángulo de 45 grados.","Haz una pausa breve en la parte baja y luego empuja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca Plano', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Banca Unilateral', '["Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.","Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.","Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.","Lower the barbell slowly towards your chest, keeping your elbows tucked in.","Pause for a moment when the barbell touches your chest.","Push the barbell back up to the starting position by extending your arms.","Repeat for the desired number of repetitions."]', '["Túmbate sobre un banco con los pies apoyados en el suelo y la espalda presionada contra el banco.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y sostenla directamente sobre el pecho con los brazos completamente extendidos.","Baja la barra lentamente hacia el pecho, manteniendo los codos pegados al cuerpo.","Haz una pausa breve cuando la barra toque el pecho.","Empuja la barra de vuelta a la posición inicial extendiendo los brazos.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro a 1 Brazo', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro con Agarre Neutro', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro con Bajada Detrás de la Cabeza', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro con Mancuernas', '["Sit on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent.","Press the dumbbells upward until your arms are fully extended and your palms are facing forward.","Rotate your wrists as you lift, so that your palms are facing forward at the top of the movement.","Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con respaldo y sujeta una mancuerna en cada mano a la altura del hombro, con las palmas hacia tu cuerpo y los codos flexionados.","Empuja las mancuernas hacia arriba hasta que los brazos estén completamente extendidos y las palmas miren hacia adelante.","Rota las muñecas mientras levantas, de modo que las palmas miren hacia adelante en la parte alta del movimiento.","Haz una pausa breve en la parte alta, luego baja lentamente las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro con Pausa en la Cabeza', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de Hombro en Máquina', '["Adjust the seat height and position yourself on the machine with your back against the backrest.","Grasp the handles with an overhand grip and position your hands slightly wider than shoulder-width apart.","Push the handles upward until your arms are fully extended, but do not lock your elbows.","Pause for a moment at the top, then slowly lower the handles back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y colócate en la máquina con la espalda apoyada en el respaldo.","Sujeta las asas con un agarre prono y coloca las manos un poco más separadas que la altura de los hombros.","Empuja las asas hacia arriba hasta que los brazos queden completamente extendidos, pero sin bloquear los codos.","Haz una pausa breve en lo alto, luego baja lentamente las asas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press de hombros', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Press Militar (por encima de la cabeza)', '["Sit on a bench with your back straight and feet flat on the ground.","Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and bring it down to shoulder level, behind your head.","Press the barbell upward until your arms are fully extended.","Lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con la espalda recta y los pies planos sobre el suelo.","Sujeta la barra con un agarre pronado, un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y bájala a la altura de los hombros, detrás de la cabeza.","Empuja la barra hacia arriba hasta que los brazos queden completamente extendidos.","Baja la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Pullover en Polea', '["Attach a rope to a cable machine and set the pulley at the highest position.","Lie down on a bench with your head towards the cable machine.","Hold the rope with both hands and extend your arms straight up above your chest.","Keeping your arms straight, slowly lower the rope behind your head while maintaining control.","Pause for a moment at the bottom, then slowly raise the rope back to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una cuerda a una máquina de cable y coloca la polea en la posición más alta.","Túmbate en un banco con la cabeza orientada hacia la máquina de cable.","Sujeta la cuerda con ambas manos y extiende los brazos rectos por encima del pecho.","Manteniendo los brazos rectos, baja lentamente la cuerda detrás de la cabeza manteniendo el control.","Haz una pausa por un momento en la parte baja y luego sube lentamente la cuerda de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo a dos manos', '["Stand with your feet shoulder-width apart and knees slightly bent.","Bend forward at the hips while keeping your back straight and chest up.","Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Pull the barbell towards your lower chest by retracting your shoulder blades and squeezing your back muscles.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y las rodillas ligeramente flexionadas.","Inclínate hacia delante desde las caderas manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Tira de la barra hacia la parte inferior del pecho retrayendo los omóplatos y contrayendo los músculos de la espalda.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo al Mentón (Upright Row)', '["Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Let the barbell hang in front of your thighs, arms fully extended.","Keeping your back straight and core engaged, exhale and lift the barbell straight up towards your chin, leading with your elbows.","Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con agarre prono, manos un poco más separadas que el ancho de los hombros.","Deja que la barra cuelgue frente a los muslos, con los brazos completamente extendidos.","Manteniendo la espalda recta y el core activado, exhala y levanta la barra en línea recta hacia la barbilla, guiando el movimiento con los codos.","Haz una pausa breve en la parte más alta, luego inhala y baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo al Mentón con Agarre Ancho', '["Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands wider than shoulder-width apart.","Let the barbell hang in front of your thighs, arms fully extended.","Keeping your back straight, exhale and lift the barbell straight up towards your chin, leading with your elbows.","Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con agarre prono, manos más separadas que el ancho de los hombros.","Deja que la barra cuelgue frente a los muslos, con los brazos completamente extendidos.","Manteniendo la espalda recta, exhala y levanta la barra en línea recta hacia la barbilla, guiando el movimiento con los codos.","Haz una pausa breve en la parte más alta, luego inhala y baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo al Mentón con Agarre Estrecho', '["Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Let the barbell hang in front of your thighs, arms fully extended.","Keeping your back straight and core engaged, exhale and lift the barbell straight up towards your chin, leading with your elbows.","Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con agarre prono, manos un poco más separadas que el ancho de los hombros.","Deja que la barra cuelgue frente a los muslos, con los brazos completamente extendidos.","Manteniendo la espalda recta y el core activado, exhala y levanta la barra en línea recta hacia la barbilla, guiando el movimiento con los codos.","Haz una pausa breve en la parte más alta, luego inhala y baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo con barra', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo con Barra de Trampa (Hex Bar Row)', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo con Barra Z (agarre en pronación)', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo con Mancuerna a 1 Mano (One-Arm Row)', '["Set up an incline bench at a 45-degree angle.","Grab a dumbbell in each hand and sit on the bench with your chest against the incline.","Extend your arms fully, allowing the dumbbells to hang straight down from your shoulders.","Pull the dumbbells up towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Toma una mancuerna en cada mano y siéntate en el banco con el pecho apoyado contra la inclinación.","Extiende completamente los brazos, dejando que las mancuernas cuelguen rectas hacia abajo desde los hombros.","Tira de las mancuernas hacia arriba, hacia el pecho, apretando los omóplatos entre sí.","Haz una pausa breve en la parte alta, luego baja lentamente las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo con Mancuerna a 2 Manos', '["Set up an incline bench at a 45-degree angle.","Grab a dumbbell in each hand and sit on the bench with your chest against the incline.","Extend your arms fully, allowing the dumbbells to hang straight down from your shoulders.","Pull the dumbbells up towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Toma una mancuerna en cada mano y siéntate en el banco con el pecho apoyado contra la inclinación.","Extiende completamente los brazos, dejando que las mancuernas cuelguen rectas hacia abajo desde los hombros.","Tira de las mancuernas hacia arriba, hacia el pecho, apretando los omóplatos entre sí.","Haz una pausa breve en la parte alta, luego baja lentamente las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo en Máquina Convergente', '["Adjust the seat height and foot platform to a comfortable position.","Sit on the machine with your chest against the pad and your feet flat on the foot platform.","Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and engage your core.","Pull the handles towards your body, squeezing your shoulder blades together.","Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la altura del asiento y la plataforma para los pies a una posición cómoda.","Siéntate en la máquina con el pecho contra la almohadilla y los pies planos sobre la plataforma para los pies.","Agarra las agarraderas con un agarre prono, un poco más separadas que el ancho de los hombros.","Mantén la espalda recta y activa el core.","Jala las agarraderas hacia el cuerpo, apretando los omóplatos entre sí.","Haz una pausa por un momento en el punto máximo del movimiento, luego suelta lentamente las agarraderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo en Máquina Sentado (Cable Row)', '["Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.","Grasp the handles with an overhand grip, keeping your back straight and your shoulders relaxed.","Pull the handles towards your body, squeezing your shoulder blades together.","Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en la máquina de remo con cable con los pies planos sobre los apoyapiés y las rodillas ligeramente flexionadas.","Sujeta las agarraderas con un agarre prono, manteniendo la espalda recta y los hombros relajados.","Jala las agarraderas hacia el cuerpo, apretando los omóplatos entre sí.","Haz una pausa por un momento en el punto máximo del movimiento, luego suelta lentamente las agarraderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo en Polea Baja con Agarre Abierto', '["Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.","Grasp the handle with a wide overhand grip, palms facing down.","Keep your back straight and lean slightly forward from the hips.","Pull the handle towards your lower chest, squeezing your shoulder blades together.","Pause for a moment at the peak of the contraction.","Slowly release the handle back to the starting position, fully extending your arms.","Repeat for the desired number of repetitions."]', '["Siéntate en la máquina de remo con cable con los pies planos sobre los apoyapiés y las rodillas ligeramente flexionadas.","Sujeta la agarradera con un agarre prono amplio, palmas hacia abajo.","Mantén la espalda recta e inclínate ligeramente hacia adelante desde las caderas.","Jala la agarradera hacia la parte baja del pecho, apretando los omóplatos entre sí.","Haz una pausa por un momento en el punto más alto de la contracción.","Suelta lentamente la agarradera de vuelta a la posición inicial, extendiendo los brazos por completo.","Repite el número de repeticiones deseado."]'),
  ('Remo en Polea Baja con Agarre Supino', '["Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.","Grasp the handles with an overhand grip, keeping your back straight and your shoulders relaxed.","Pull the handles towards your body, squeezing your shoulder blades together.","Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en la máquina de remo con cable con los pies planos sobre los apoyapiés y las rodillas ligeramente flexionadas.","Sujeta las agarraderas con un agarre prono, manteniendo la espalda recta y los hombros relajados.","Jala las agarraderas hacia el cuerpo, apretando los omóplatos entre sí.","Haz una pausa por un momento en el punto máximo del movimiento, luego suelta lentamente las agarraderas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo Gironda (V-Bar Row)', '["Stand with your feet shoulder-width apart and knees slightly bent.","Bend forward at the hips while keeping your back straight and chest up.","Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Pull the barbell towards your lower chest by retracting your shoulder blades and squeezing your back muscles.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y las rodillas ligeramente flexionadas.","Inclínate hacia delante desde las caderas manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Tira de la barra hacia la parte inferior del pecho retrayendo los omóplatos y contrayendo los músculos de la espalda.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo Inclinado con Bajada Excéntrica Lenta', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo Inclinado con Barra (Barbell Row)', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo Inclinado con Barra en T (T-Bar Row)', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Remo Inclinado con Pausa en el Pecho', '["Set up an incline bench at a 45-degree angle.","Lie face down on the bench with your chest against the pad and your feet flat on the ground.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Keep your back straight and your core engaged.","Pull the barbell towards your chest, squeezing your shoulder blades together.","Pause for a moment at the top, then slowly lower the barbell back to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca un banco inclinado a un ángulo de 45 grados.","Túmbate boca abajo en el banco con el pecho apoyado en el respaldo y los pies planos sobre el suelo.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Mantén la espalda recta y el core activado.","Tira de la barra hacia el pecho, juntando los omóplatos.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Rodillo de Muñeca (Wrist Roller)', '["Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, holding a barbell with an underhand grip.","Allow the barbell to roll down to your fingertips, keeping your wrists straight.","Slowly curl the barbell up towards your forearms by flexing your wrists.","Pause for a moment at the top, then slowly lower the barbell back down to the starting position.","Repeat for the desired number of repetitions."]', '["Siéntate en un banco con los pies planos en el suelo y los antebrazos apoyados sobre los muslos, sujetando una barra con agarre supino.","Deja que la barra ruede hacia las puntas de los dedos, manteniendo las muñecas rectas.","Enrolla lentamente la barra hacia los antebrazos flexionando las muñecas.","Haz una pausa breve en la parte alta y luego baja lentamente la barra de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Rueda Abdominal (Ab Wheel Rollout)', '["Lie flat on your back with your knees bent and feet flat on the ground.","Place your hands behind your head with your elbows pointing outwards.","Engage your abs and lift your shoulders off the ground, curling forward towards your knees.","Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo.","Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera.","Activa el abdomen y levanta los hombros del suelo, flexionándote hacia adelante en dirección a las rodillas.","Haz una pausa breve en la parte alta, luego baja lentamente los hombros de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Russian twists', '["Sit on a stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.","Hold the cable handle with both hands and extend your arms straight out in front of you.","Lean back slightly while keeping your back straight and your core engaged.","Twist your torso to the right, bringing the cable handle towards your right hip.","Pause for a moment, then twist your torso to the left, bringing the cable handle towards your left hip.","Continue alternating twists for the desired number of repetitions."]', '["Siéntate sobre un balón de estabilidad con los pies apoyados planos en el suelo y las rodillas flexionadas en un ángulo de 90 grados.","Sujeta la agarradera del cable con ambas manos y extiende los brazos rectos frente a ti.","Inclínate ligeramente hacia atrás manteniendo la espalda recta y el core activado.","Gira el torso hacia la derecha, llevando la agarradera del cable hacia la cadera derecha.","Haz una pausa por un momento y luego gira el torso hacia la izquierda, llevando la agarradera del cable hacia la cadera izquierda.","Continúa alternando los giros el número de repeticiones deseado."]'),
  ('Saltos de Gemelos (Pliométricos)', '["Adjust the machine to your height and stand with your feet shoulder-width apart.","Place your shoulders under the pads and hold onto the handles for stability.","Raise your heels as high as possible by extending your ankles.","Pause for a moment at the top, then slowly lower your heels back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ajusta la máquina a tu altura y ponte de pie con los pies separados a la altura de los hombros.","Coloca los hombros debajo de las almohadillas y sujétate de las asas para mayor estabilidad.","Eleva los talones tan alto como puedas extendiendo los tobillos.","Haz una pausa breve en la parte alta y luego baja lentamente los talones de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Saltos de tijera', '["Stand with your feet together and your arms by your sides.","Jump up, spreading your feet apart and raising your arms above your head.","As you land, quickly jump back to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies juntos y los brazos a los costados.","Salta, separando los pies y levantando los brazos por encima de la cabeza.","Al aterrizar, salta rápidamente de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Búlgara (Búlgar Split Squat)', '["Stand facing away from a suspension trainer with your feet shoulder-width apart.","Extend one leg forward and place the top of your foot in the foot cradle of the suspension trainer.","Bend your standing leg and lower your body down into a lunge position, keeping your chest up and your knee in line with your toes.","Push through your heel to return to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie de espaldas a un entrenador de suspensión con los pies separados a la altura de los hombros.","Extiende una pierna hacia adelante y coloca el empeine del pie en el soporte para pie del entrenador de suspensión.","Flexiona la pierna de apoyo y baja el cuerpo a una posición de zancada, manteniendo el pecho elevado y la rodilla alineada con la punta del pie.","Empuja con el talón para regresar a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Sentadilla Búlgara con Pausa', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Apoyo en Pared (Wall Squat)', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Bajada Lenta (Tempo 4-1-1)', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Banda Elástica', '["Stand with your feet shoulder-width apart, with the band placed just above your knees.","Keeping your chest up and core engaged, push your hips back and bend your knees to lower into a squat position.","Make sure your knees are tracking over your toes and your weight is in your heels.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con la banda colocada justo por encima de las rodillas.","Manteniendo el pecho arriba y el core activado, lleva las caderas hacia atrás y flexiona las rodillas para bajar a una posición de sentadilla.","Asegúrate de que las rodillas se alineen con los dedos de los pies y de que el peso recaiga en los talones.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Barra de Trampa (Hex Bar Squat)', '["Set up a barbell on a squat rack at chest height.","Stand facing away from the rack, with your feet shoulder-width apart.","Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart.","Lower your body down into a squat, keeping your knees in line with your toes.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca una barra en un soporte de sentadillas a la altura del pecho.","Ponte de pie de espaldas al soporte, con los pies separados a la altura de los hombros.","Flexiona las rodillas y baja el cuerpo hacia una posición de sentadilla, manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y retrocede un paso, asegurándote de que los pies sigan separados a la altura de los hombros.","Baja el cuerpo hacia una sentadilla, manteniendo las rodillas alineadas con los dedos de los pies.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Cadenas', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Mancuernas a los Lados', '["Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.","Keeping your chest up and core engaged, lower your body down by bending at the knees and hips, as if sitting back into a chair.","Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, sosteniendo una mancuerna en cada mano a los costados.","Manteniendo el pecho arriba y el core activado, baja el cuerpo flexionando las rodillas y las caderas, como si te sentaras en una silla.","Continúa bajando hasta que los muslos queden paralelos al suelo, o tan abajo como puedas hacerlo cómodamente.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Pausa en el Punto Bajo', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla con Pierna Adelantada (Split Squat)', '["Stand facing away from a suspension trainer with your feet shoulder-width apart.","Extend one leg forward and place the top of your foot in the foot cradle of the suspension trainer.","Bend your standing leg and lower your body down into a lunge position, keeping your chest up and your knee in line with your toes.","Push through your heel to return to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie de espaldas a un entrenador de suspensión con los pies separados a la altura de los hombros.","Extiende una pierna hacia adelante y coloca el empeine del pie en el soporte para pie del entrenador de suspensión.","Flexiona la pierna de apoyo y baja el cuerpo a una posición de zancada, manteniendo el pecho elevado y la rodilla alineada con la punta del pie.","Empuja con el talón para regresar a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Sentadilla con Salto (Jump Squat)', '["Stand with your feet shoulder-width apart.","Lower your body into a squat position by bending your knees and pushing your hips back.","Jump explosively off the ground, extending your hips, knees, and ankles.","While in mid-air, quickly bring your arms forward for balance.","Land softly on the balls of your feet and immediately go into the next repetition.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros.","Baja el cuerpo hacia una posición de sentadilla flexionando las rodillas y empujando las caderas hacia atrás.","Salta de forma explosiva desde el suelo, extendiendo las caderas, las rodillas y los tobillos.","Mientras estás en el aire, lleva rápidamente los brazos hacia adelante para mantener el equilibrio.","Aterriza suavemente sobre la punta de los pies y pasa de inmediato a la siguiente repetición.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla en Máquina Hack', '["Start by standing with your feet shoulder-width apart and your toes slightly turned out.","Hold the barbell behind your legs, resting it on your upper thighs.","Lower your body by bending at the knees and hips, keeping your back straight and your chest up.","Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.","Pause for a moment, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y los dedos de los pies ligeramente hacia afuera.","Sujeta la barra detrás de las piernas, apoyándola en la parte superior de los muslos.","Baja el cuerpo flexionando las rodillas y las caderas, manteniendo la espalda recta y el pecho elevado.","Continúa bajando hasta que los muslos queden paralelos al suelo, o tan abajo como puedas hacerlo cómodamente.","Haz una pausa breve y luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla en Máquina Multipower', '["Set up the smith machine with the barbell at an appropriate height for your squat.","Stand with your feet shoulder-width apart, toes slightly turned out.","Position yourself under the barbell, resting it on your upper traps and shoulders.","Grip the barbell with a wide grip, slightly wider than shoulder-width apart.","Engage your core and unrack the barbell, stepping back to clear the rack.","Keeping your chest up and back straight, initiate the squat by bending at the hips and knees.","Lower your body until your thighs are parallel to the ground or slightly below.","Pause for a moment at the bottom, then drive through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Configura la máquina Smith con la barra a una altura adecuada para tu sentadilla.","Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Colócate debajo de la barra, apoyándola en la parte alta de los trapecios y los hombros.","Agarra la barra con un agarre amplio, un poco más ancho que la separación de los hombros.","Activa el core y suelta la barra del soporte, dando un paso atrás para alejarte del soporte.","Manteniendo el pecho elevado y la espalda recta, inicia la sentadilla doblando las caderas y las rodillas.","Baja el cuerpo hasta que los muslos queden paralelos al suelo o un poco por debajo.","Haz una pausa por un momento en la posición baja, luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla en Máquina Smith', '["Set up the smith machine with the barbell at an appropriate height for your squat.","Stand with your feet shoulder-width apart, toes slightly turned out.","Position yourself under the barbell, resting it on your upper traps and shoulders.","Grip the barbell with a wide grip, slightly wider than shoulder-width apart.","Engage your core and unrack the barbell, stepping back to clear the rack.","Keeping your chest up and back straight, initiate the squat by bending at the hips and knees.","Lower your body until your thighs are parallel to the ground or slightly below.","Pause for a moment at the bottom, then drive through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Configura la máquina Smith con la barra a una altura adecuada para tu sentadilla.","Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Colócate debajo de la barra, apoyándola en la parte alta de los trapecios y los hombros.","Agarra la barra con un agarre amplio, un poco más ancho que la separación de los hombros.","Activa el core y suelta la barra del soporte, dando un paso atrás para alejarte del soporte.","Manteniendo el pecho elevado y la espalda recta, inicia la sentadilla doblando las caderas y las rodillas.","Baja el cuerpo hasta que los muslos queden paralelos al suelo o un poco por debajo.","Haz una pausa por un momento en la posición baja, luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Frontal', '["Start by standing with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell in front of your shoulders, resting it on your collarbone and shoulders.","Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees.","Lower until your thighs are parallel to the ground, or as low as you can comfortably go.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra frente a los hombros, apoyándola sobre la clavícula y los hombros.","Activa el core y mantén el pecho elevado mientras bajas el cuerpo hacia una posición de sentadilla, empujando las caderas hacia atrás y flexionando las rodillas.","Baja hasta que los muslos queden paralelos al suelo, o tan abajo como puedas hacerlo cómodamente.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Goblet (Copa)', '["Stand with your feet shoulder-width apart, holding a dumbbell vertically against your chest with both hands.","Keeping your chest up and core engaged, lower your body down into a squat position by pushing your hips back and bending your knees.","Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, sosteniendo una mancuerna verticalmente contra el pecho con ambas manos.","Manteniendo el pecho erguido y el core activado, baja el cuerpo a una posición de sentadilla empujando las caderas hacia atrás y flexionando las rodillas.","Continúa bajando hasta que los muslos queden paralelos al suelo, o tan abajo como puedas hacerlo cómodamente.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Sissy (Sissy Squat)', '["Stand with your feet shoulder-width apart and your toes pointing slightly outward.","Hold onto a stable object for balance if needed.","Slowly lower your body by bending your knees and leaning back, keeping your torso upright.","Continue lowering until your thighs are parallel to the ground or as far as you can comfortably go.","Pause for a moment, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y los dedos de los pies ligeramente hacia afuera.","Sujétate de un objeto estable para mantener el equilibrio si es necesario.","Baja lentamente el cuerpo doblando las rodillas e inclinándote hacia atrás, manteniendo el torso erguido.","Continúa bajando hasta que los muslos queden paralelos al suelo o tan lejos como puedas llegar cómodamente.","Haz una pausa breve y luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Trasera con Barra Alta', '["Set up a barbell on a squat rack at chest height.","Stand facing away from the rack, with your feet shoulder-width apart.","Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart.","Lower your body down into a squat, keeping your knees in line with your toes.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca una barra en un soporte de sentadillas a la altura del pecho.","Ponte de pie de espaldas al soporte, con los pies separados a la altura de los hombros.","Flexiona las rodillas y baja el cuerpo hacia una posición de sentadilla, manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y retrocede un paso, asegurándote de que los pies sigan separados a la altura de los hombros.","Baja el cuerpo hacia una sentadilla, manteniendo las rodillas alineadas con los dedos de los pies.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Trasera con Barra Baja', '["Set up a barbell on a squat rack at chest height.","Stand facing away from the rack, with your feet shoulder-width apart.","Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart.","Lower your body down into a squat, keeping your knees in line with your toes.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca una barra en un soporte de sentadillas a la altura del pecho.","Ponte de pie de espaldas al soporte, con los pies separados a la altura de los hombros.","Flexiona las rodillas y baja el cuerpo hacia una posición de sentadilla, manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y retrocede un paso, asegurándote de que los pies sigan separados a la altura de los hombros.","Baja el cuerpo hacia una sentadilla, manteniendo las rodillas alineadas con los dedos de los pies.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadilla Zercher', '["Stand with your feet shoulder-width apart and toes slightly turned out.","Hold the barbell in the crooks of your elbows, with your hands gripping the bar for stability.","Engage your core and keep your chest lifted as you lower your hips back and down into a squat position.","Keep your knees in line with your toes and your weight in your heels.","Pause for a moment at the bottom of the squat, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y los dedos de los pies ligeramente hacia afuera.","Sujeta la barra en el pliegue de los codos, con las manos agarrando la barra para mayor estabilidad.","Activa el core y mantén el pecho elevado mientras bajas las caderas hacia atrás y hacia abajo en una posición de sentadilla.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Haz una pausa breve en la parte baja de la sentadilla y luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadillas', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Sentadillas con barra', '["Set up a barbell on a squat rack at chest height.","Stand facing away from the rack, with your feet shoulder-width apart.","Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.","Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.","Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart.","Lower your body down into a squat, keeping your knees in line with your toes.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Coloca una barra en un soporte de sentadillas a la altura del pecho.","Ponte de pie de espaldas al soporte, con los pies separados a la altura de los hombros.","Flexiona las rodillas y baja el cuerpo hacia una posición de sentadilla, manteniendo la espalda recta y el pecho elevado.","Agarra la barra con un agarre pronado un poco más ancho que la separación de los hombros.","Levanta la barra del soporte y retrocede un paso, asegurándote de que los pies sigan separados a la altura de los hombros.","Baja el cuerpo hacia una sentadilla, manteniendo las rodillas alineadas con los dedos de los pies.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sentadillas con mancuernas', '["Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.","Keeping your chest up and core engaged, lower your body down by bending at the knees and hips, as if sitting back into a chair.","Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.","Pause for a moment at the bottom, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, sosteniendo una mancuerna en cada mano a los costados.","Manteniendo el pecho arriba y el core activado, baja el cuerpo flexionando las rodillas y las caderas, como si te sentaras en una silla.","Continúa bajando hasta que los muslos queden paralelos al suelo, o tan abajo como puedas hacerlo cómodamente.","Haz una pausa por un momento en la parte inferior, luego empuja con los talones para regresar a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Sissy Squat (Sentadilla Sissy)', '["Stand with your feet shoulder-width apart and your toes pointing slightly outward.","Hold onto a stable object for balance if needed.","Slowly lower your body by bending your knees and leaning back, keeping your torso upright.","Continue lowering until your thighs are parallel to the ground or as far as you can comfortably go.","Pause for a moment, then push through your heels to return to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y los dedos de los pies ligeramente hacia afuera.","Sujétate de un objeto estable para mantener el equilibrio si es necesario.","Baja lentamente el cuerpo doblando las rodillas e inclinándote hacia atrás, manteniendo el torso erguido.","Continúa bajando hasta que los muslos queden paralelos al suelo o tan lejos como puedas llegar cómodamente.","Haz una pausa breve y luego empuja con los talones para volver a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Snatch (Arrancada)', '["Stand with your feet shoulder-width apart and the barbell on the floor in front of you.","Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.","Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body.","As the barbell reaches your thighs, explosively extend your hips, shrug your shoulders, and pull the barbell up towards your chest.","As the barbell reaches chest height, quickly drop under it and catch it at shoulder level, with your elbows pointing forward and your palms facing up.","From the catch position, press the barbell overhead by extending your arms and pushing the barbell straight up.","Lower the barbell back down to the starting position and repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y la barra en el suelo frente a ti.","Flexiona las rodillas y las caderas para bajar y agarrar la barra con un agarre pronado, con las manos un poco más separadas que el ancho de los hombros.","Empuja con los talones y extiende las caderas y las rodillas para levantar la barra del suelo, manteniéndola cerca del cuerpo.","Cuando la barra llegue a los muslos, extiende las caderas de forma explosiva, encoge los hombros y tira de la barra hacia el pecho.","Cuando la barra llegue a la altura del pecho, baja rápidamente debajo de ella y atrápala a la altura de los hombros, con los codos apuntando hacia delante y las palmas hacia arriba.","Desde la posición de recepción, empuja la barra por encima de la cabeza extendiendo los brazos y llevando la barra recta hacia arriba.","Baja la barra de vuelta a la posición inicial y repite el número de repeticiones deseado."]'),
  ('Step-up con Mancuerna', '["Stand in front of a bench or step with a dumbbell in each hand, palms facing your body.","Place your right foot on the bench or step, ensuring your entire foot is in contact with the surface.","Push through your right heel and lift your body up onto the bench or step, straightening your right leg.","Bring your left foot up onto the bench or step, standing fully upright.","Step back down with your left foot, followed by your right foot, returning to the starting position.","Repeat for the desired number of repetitions, then switch legs."]', '["Ponte de pie frente a un banco o escalón con una mancuerna en cada mano, con las palmas hacia tu cuerpo.","Coloca el pie derecho sobre el banco o escalón, asegurándote de que todo el pie esté en contacto con la superficie.","Empuja con el talón derecho y sube el cuerpo sobre el banco o escalón, enderezando la pierna derecha.","Sube el pie izquierdo hasta el banco o escalón, quedando completamente erguido.","Baja con el pie izquierdo, seguido del pie derecho, volviendo a la posición inicial.","Repite el número de repeticiones deseado, luego cambia de pierna."]'),
  ('Suitcase Carry (Carga Maletero)', '["Stand up straight with a dumbbell in each hand, palms facing your sides.","Keep your back straight and your shoulders back.","Take small, controlled steps forward, maintaining an upright posture.","Continue walking for the desired distance or time.","To finish, stop walking and carefully lower the dumbbells to your sides."]', '["Ponte de pie con una mancuerna en cada mano, palmas hacia los costados.","Mantén la espalda recta y los hombros hacia atrás.","Da pasos pequeños y controlados hacia adelante, manteniendo una postura erguida.","Continúa caminando durante la distancia o el tiempo deseado.","Para terminar, deja de caminar y baja con cuidado las mancuernas a los costados."]'),
  ('Sujeción con Pinza (Plate Pinch)', '["Stand up straight with a dumbbell in each hand, palms facing your sides.","Keep your back straight and your shoulders back.","Take small, controlled steps forward, maintaining an upright posture.","Continue walking for the desired distance or time.","To finish, stop walking and carefully lower the dumbbells to your sides."]', '["Ponte de pie con una mancuerna en cada mano, palmas hacia los costados.","Mantén la espalda recta y los hombros hacia atrás.","Da pasos pequeños y controlados hacia adelante, manteniendo una postura erguida.","Continúa caminando durante la distancia o el tiempo deseado.","Para terminar, deja de caminar y baja con cuidado las mancuernas a los costados."]'),
  ('Thruster (Sentadilla + Press)', '["Stand with your feet shoulder-width apart, toes slightly turned out.","Hold the barbell across your upper back, resting it on your traps or rear delts.","Engage your core and keep your chest up as you begin to lower your body down.","Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.","Lower yourself until your thighs are parallel to the ground or slightly below.","Keep your knees in line with your toes and your weight in your heels.","Drive through your heels to stand back up, extending your hips and knees.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros, con los dedos de los pies ligeramente hacia afuera.","Sujeta la barra sobre la parte superior de la espalda, apoyándola en los trapecios o los deltoides posteriores.","Activa el core y mantén el pecho elevado mientras comienzas a bajar el cuerpo.","Flexiona las rodillas y las caderas, empujando las caderas hacia atrás y hacia abajo como si te sentaras en una silla.","Baja hasta que los muslos queden paralelos al suelo o un poco por debajo.","Mantén las rodillas alineadas con los dedos de los pies y el peso sobre los talones.","Empuja con los talones para volver a ponerte de pie, extendiendo las caderas y las rodillas.","Repite el número de repeticiones deseado."]'),
  ('Tríceps con cuerda', '["Attach a straight bar to a high pulley cable machine.","Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.","Grasp the bar with an overhand grip, hands shoulder-width apart.","Keep your elbows close to your sides and your upper arms stationary.","Exhale and push the bar down until your elbows are fully extended.","Pause for a moment, then inhale and slowly return the bar to the starting position.","Repeat for the desired number of repetitions."]', '["Sujeta una barra recta a una máquina de cable con polea alta.","Ponte de pie frente a la máquina con los pies separados a la altura de los hombros y una ligera flexión en las rodillas.","Sujeta la barra con un agarre prono, con las manos separadas a la altura de los hombros.","Mantén los codos cerca de los costados y los brazos superiores quietos.","Exhala y empuja la barra hacia abajo hasta que los codos queden completamente extendidos.","Haz una pausa por un momento, luego inhala y regresa lentamente la barra a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Tríceps con mancuernas', '["Lie on a decline bench with your head lower than your feet and hold a dumbbell in each hand, palms facing each other.","Extend your arms fully, keeping your elbows close to your head.","Lower the dumbbells slowly behind your head, bending your elbows.","Pause for a moment, then raise the dumbbells back to the starting position.","Repeat for the desired number of repetitions."]', '["Túmbate en un banco declinado con la cabeza más baja que los pies y sostén una mancuerna en cada mano, con las palmas enfrentadas entre sí.","Extiende completamente los brazos, manteniendo los codos cerca de la cabeza.","Baja lentamente las mancuernas detrás de la cabeza, flexionando los codos.","Haz una pausa por un momento, luego levanta las mancuernas de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Vuelos Posteriores (Deltoides Posterior)', '["Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.","Keep your back straight and engage your core.","Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.","Pause for a moment at the top, then slowly lower your arms back down to the starting position.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros y sostén una mancuerna en cada mano, con las palmas hacia el cuerpo.","Mantén la espalda recta y activa el core.","Levanta los brazos hacia los lados hasta que queden paralelos al suelo, manteniendo una ligera flexión en los codos.","Haz una pausa por un momento en la parte superior, luego baja lentamente los brazos de vuelta a la posición inicial.","Repite el número de repeticiones deseado."]'),
  ('Zancada Caminando (Walking Lunge)', '["Stand with your feet shoulder-width apart.","Take a step forward with your right leg, lowering your body into a lunge position.","Keep your torso upright and your front knee aligned with your ankle.","Push off with your right foot and bring your left foot forward, stepping into a lunge position with your left leg.","Continue alternating legs and walking forward, maintaining a controlled and steady pace.","Repeat for the desired number of repetitions."]', '["Ponte de pie con los pies separados a la altura de los hombros.","Da un paso adelante con la pierna derecha, bajando el cuerpo a una posición de zancada.","Mantén el torso erguido y la rodilla delantera alineada con el tobillo.","Empújate con el pie derecho y lleva el pie izquierdo hacia adelante, entrando en una posición de zancada con la pierna izquierda.","Continúa alternando las piernas y avanzando, manteniendo un ritmo controlado y constante.","Repite el número de repeticiones deseado."]'),
  ('Zancada con Desplazamiento Lateral (Skater Squat)', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada con Giro de Tronco', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada con Pausa en el Punto Bajo', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada con Pierna Elevada Trasera (Búlgaro)', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada con Salto (Jump Lunge)', '["Start by standing with your feet shoulder-width apart.","Take a step forward with your right foot, lowering your body into a lunge position.","Push off with your right foot and jump into the air, switching the position of your feet mid-air.","Land softly with your left foot forward and immediately lower your body into a lunge position.","Continue alternating between lunges and jumps for the desired number of repetitions."]', '["Comienza de pie con los pies separados a la altura de los hombros.","Da un paso adelante con el pie derecho, bajando el cuerpo hasta una posición de zancada.","Empújate con el pie derecho y salta al aire, cambiando la posición de los pies en pleno vuelo.","Aterriza suavemente con el pie izquierdo hacia adelante y baja inmediatamente el cuerpo a una posición de zancada.","Continúa alternando entre zancadas y saltos el número de repeticiones deseado."]'),
  ('Zancada Cruzada (Curtsy Lunge)', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada Hacia Atrás (Reverse Lunge)', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]'),
  ('Zancada Lateral (Side Lunge)', '["Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.","Take a step forward with your right foot, keeping your torso upright.","Lower your body by bending your right knee until your thigh is parallel to the ground.","Push through your right heel to return to the starting position.","Repeat with your left leg, alternating legs for the desired number of repetitions."]', '["Empieza de pie con los pies separados a la altura de los hombros y una barra apoyada sobre la parte superior de la espalda.","Da un paso hacia delante con el pie derecho, manteniendo el torso erguido.","Baja el cuerpo flexionando la rodilla derecha hasta que el muslo quede paralelo al suelo.","Empuja con el talón derecho para regresar a la posición inicial.","Repite con la pierna izquierda, alternando las piernas el número de repeticiones deseado."]')
) as v(name, en, es)
where lower(e.name) = lower(v.name);

commit;

-- Verify: select count(*) from public.exercises where instructions_es is not null;

-- ==========================================================================
-- [24] 20260724120000_program_templates.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Program TEMPLATES (reusable blueprints) + assignment provenance.
--
-- Until now every program was authored per client. A coach who runs the same
-- 5-week block with ten clients had to rebuild it ten times. This adds a
-- template library:
--
--   * a TEMPLATE is a programs row with user_id IS NULL and is_template = true
--     (no client, no start date meaning, never visible to any client);
--   * ASSIGNING deep-copies the whole graph (days → exercises + weeks) into a
--     new per-client program row, stamped with template_id so the panel can
--     answer "which clients are on this program?";
--   * editing a template therefore NEVER mutates a client's running block —
--     the copy is a snapshot, which is what a periodized block needs.
--
-- Client-facing behaviour is unchanged: the app fetches
-- (user_id = me AND status = 'active'), and templates have a null user_id, so
-- they can't leak into any client's app. The one-active-per-client rule and its
-- auto-archive trigger keep working exactly as before.
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

-- 1) Columns -----------------------------------------------------------------
alter table public.programs
  add column if not exists is_template boolean not null default false;

-- Provenance of an assigned copy. ON DELETE SET NULL: deleting a template must
-- never cascade into a client's assigned program.
alter table public.programs
  add column if not exists template_id uuid references public.programs(id) on delete set null;

-- Templates have no client.
alter table public.programs alter column user_id drop not null;

create index if not exists idx_programs_template on public.programs(template_id);
create index if not exists idx_programs_is_template on public.programs(is_template) where is_template;

-- A template has no client; an assigned program must have one.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'programs_template_shape') then
    alter table public.programs add constraint programs_template_shape check (
      (is_template and user_id is null) or (not is_template and user_id is not null)
    );
  end if;
end $$;

-- 2) One-active-per-client index must ignore templates ------------------------
--    (NULLs are already distinct in a unique index, but be explicit.)
drop index if exists public.uniq_one_active_program_per_user;
create unique index if not exists uniq_one_active_program_per_user
  on public.programs (user_id)
  where status = 'active' and user_id is not null;

-- 3) start_date guard must not apply to templates -----------------------------
--    A template's start_date is meaningless boilerplate; only real assignments
--    are held to "cannot start in the past".
create or replace function public.guard_program_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_template then
    return new;
  end if;
  if new.start_date < current_date
     and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date)
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'program start_date cannot be in the past';
  end if;
  return new;
end;
$$;

-- 4) save_coach_program: p_client_id NULL now means "save a template" ---------
--    Same signature, so this is a plain replace. Everything else is unchanged.
create or replace function public.save_coach_program(
  p_program_id uuid,
  p_client_id  uuid,   -- NULL => template
  p_header     jsonb,
  p_days       jsonb,
  p_weeks      jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_program_id  uuid;
  v_day         jsonb;
  v_day_id      uuid;
  v_is_template boolean := p_client_id is null;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage programs' using errcode = '42501';
  end if;

  if p_program_id is null then
    insert into public.programs
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, progression_rule, tempo_default, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       coalesce((p_header->>'duration_weeks')::int, 1),
       coalesce((p_header->>'start_date')::date, current_date),
       -- For a TEMPLATE, status means library shelf-state: 'active' = available
       -- to assign, 'archived' = retired (templates are never deleted). It can
       -- never collide with the one-active-per-CLIENT rule, since that index and
       -- trigger both ignore rows with a null user_id.
       coalesce(nullif(p_header->>'status', ''), 'active'),
       nullif(p_header->>'progression_rule', ''),
       nullif(p_header->>'tempo_default', ''),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_program_id;
  else
    update public.programs set
       name             = p_header->>'name',
       description      = nullif(p_header->>'description', ''),
       focus            = nullif(p_header->>'focus', ''),
       duration_weeks   = coalesce((p_header->>'duration_weeks')::int, 1),
       start_date       = coalesce((p_header->>'start_date')::date, start_date),
       status           = case when is_template then status
                               else coalesce(nullif(p_header->>'status', ''), 'active') end,
       progression_rule = nullif(p_header->>'progression_rule', ''),
       tempo_default    = nullif(p_header->>'tempo_default', ''),
       notes            = nullif(p_header->>'notes', ''),
       updated_at       = now()
     where id = p_program_id
    returning id into v_program_id;

    if v_program_id is null then
      raise exception 'Program % not found', p_program_id using errcode = 'no_data_found';
    end if;

    delete from public.program_days  where program_id = v_program_id;
    delete from public.program_weeks where program_id = v_program_id;
  end if;

  for v_day in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    insert into public.program_days (program_id, day_index, label, weekday, sort_order)
    values (v_program_id,
        (v_day->>'day_index')::int,
        nullif(v_day->>'label', ''),
        nullif(v_day->>'weekday', ''),
        coalesce((v_day->>'sort_order')::int, 0))
    returning id into v_day_id;

    insert into public.program_exercises
      (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral,
       rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order)
    select v_day_id,
        nullif(e->>'exercise_id', '')::uuid,
        nullif(e->>'custom_name', ''),
        coalesce((e->>'sets')::int, 3),
        nullif(e->>'rep_min', '')::int,
        nullif(e->>'rep_max', '')::int,
        coalesce((e->>'is_unilateral')::boolean, false),
        nullif(e->>'rir_min', '')::int,
        nullif(e->>'rir_max', '')::int,
        nullif(e->>'load_pct_1rm', '')::int,
        nullif(e->>'load_qualitative', ''),
        nullif(e->>'tempo', ''),
        nullif(e->>'rest_seconds', '')::int,
        nullif(e->>'notes', ''),
        coalesce((e->>'sort_order')::int, 0)
    from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb)) as e;
  end loop;

  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max,
     is_deload, sets_override, notes)
  select v_program_id,
      (w->>'week_number')::int,
      nullif(w->>'label', ''),
      nullif(w->>'rir_min', '')::int,
      nullif(w->>'rir_max', '')::int,
      nullif(w->>'load_pct_min', '')::int,
      nullif(w->>'load_pct_max', '')::int,
      coalesce((w->>'is_deload')::boolean, false),
      nullif(w->>'sets_override', '')::int,
      nullif(w->>'notes', '')
  from jsonb_array_elements(coalesce(p_weeks, '[]'::jsonb)) as w;

  return v_program_id;
end;
$$;

-- 5) Assign a template to a client: deep-copy the whole graph ------------------
--    The copy is a snapshot (later template edits don't touch it) and becomes
--    the client's ACTIVE program — the single-active trigger auto-archives
--    whatever they were on before.
create or replace function public.assign_program_template(
  p_template_id uuid,
  p_client_id   uuid,
  p_start_date  date default current_date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
  v_day    record;
  v_day_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign programs' using errcode = '42501';
  end if;

  if not exists (select 1 from public.programs
                  where id = p_template_id and is_template) then
    raise exception 'Template % not found', p_template_id using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.programs
              where id = p_template_id and is_template and status <> 'active') then
    raise exception 'Template % is archived — restore it before assigning', p_template_id;
  end if;

  insert into public.programs
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, progression_rule, tempo_default, notes,
     is_template, template_id)
  select p_client_id, auth.uid(), 'coach', t.name, t.description, t.focus,
         t.duration_weeks, coalesce(p_start_date, current_date), 'active',
         t.progression_rule, t.tempo_default, t.notes, false, t.id
    from public.programs t
   where t.id = p_template_id
  returning id into v_new_id;

  for v_day in
    select * from public.program_days where program_id = p_template_id order by sort_order, day_index
  loop
    insert into public.program_days (program_id, day_index, label, weekday, sort_order)
    values (v_new_id, v_day.day_index, v_day.label, v_day.weekday, v_day.sort_order)
    returning id into v_day_id;

    insert into public.program_exercises
      (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral,
       rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order)
    select v_day_id, e.exercise_id, e.custom_name, e.sets, e.rep_min, e.rep_max, e.is_unilateral,
           e.rir_min, e.rir_max, e.load_pct_1rm, e.load_qualitative, e.tempo, e.rest_seconds,
           e.notes, e.sort_order
      from public.program_exercises e
     where e.program_day_id = v_day.id;
  end loop;

  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max,
     is_deload, sets_override, notes)
  select v_new_id, w.week_number, w.label, w.rir_min, w.rir_max, w.load_pct_min,
         w.load_pct_max, w.is_deload, w.sets_override, w.notes
    from public.program_weeks w
   where w.program_id = p_template_id;

  return v_new_id;
end;
$$;

revoke all     on function public.assign_program_template(uuid, uuid, date) from public;
grant  execute on function public.assign_program_template(uuid, uuid, date) to authenticated;

-- 6) Promote a client's one-off program into a reusable template --------------
--    The mirror of assign_program_template: copies the graph back out into an
--    ownerless library entry, so a block built for one client can be reused.
--    The source program is left untouched.
create or replace function public.save_program_as_template(
  p_program_id uuid,
  p_name       text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
  v_day    record;
  v_day_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage programs' using errcode = '42501';
  end if;

  if not exists (select 1 from public.programs where id = p_program_id) then
    raise exception 'Program % not found', p_program_id using errcode = 'no_data_found';
  end if;

  insert into public.programs
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, progression_rule, tempo_default, notes,
     is_template, template_id)
  select null, auth.uid(), 'coach',
         coalesce(nullif(btrim(p_name), ''), p.name),
         p.description, p.focus, p.duration_weeks,
         current_date, 'active',
         p.progression_rule, p.tempo_default, p.notes,
         true, null
    from public.programs p
   where p.id = p_program_id
  returning id into v_new_id;

  for v_day in
    select * from public.program_days where program_id = p_program_id order by sort_order, day_index
  loop
    insert into public.program_days (program_id, day_index, label, weekday, sort_order)
    values (v_new_id, v_day.day_index, v_day.label, v_day.weekday, v_day.sort_order)
    returning id into v_day_id;

    insert into public.program_exercises
      (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral,
       rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order)
    select v_day_id, e.exercise_id, e.custom_name, e.sets, e.rep_min, e.rep_max, e.is_unilateral,
           e.rir_min, e.rir_max, e.load_pct_1rm, e.load_qualitative, e.tempo, e.rest_seconds,
           e.notes, e.sort_order
      from public.program_exercises e
     where e.program_day_id = v_day.id;
  end loop;

  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max,
     is_deload, sets_override, notes)
  select v_new_id, w.week_number, w.label, w.rir_min, w.rir_max, w.load_pct_min,
         w.load_pct_max, w.is_deload, w.sets_override, w.notes
    from public.program_weeks w
   where w.program_id = p_program_id;

  -- Claim the source program for the new template. Without this the client who
  -- inspired the template wouldn't appear under "Clientes asignados" — they ARE
  -- running it, so the library should say so. Only ever fills a null.
  update public.programs
     set template_id = v_new_id, updated_at = now()
   where id = p_program_id
     and template_id is null
     and not is_template;

  return v_new_id;
end;
$$;

revoke all     on function public.save_program_as_template(uuid, text) from public;
grant  execute on function public.save_program_as_template(uuid, text) to authenticated;

commit;

-- Verify:
--   select count(*) from public.programs where is_template;            -- library size
--   select name, user_id, template_id from public.programs order by created_at desc limit 5;

-- ==========================================================================
-- [25] 20260803120000_start_date_timezone_tolerance.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Fix: creating a program failed every evening.
--
-- The panel builds the default start_date from the BROWSER's local date, but
-- guard_program_start_date compares it against `current_date`, which on
-- Supabase is UTC. West of UTC (the coach is at UTC-4) the browser is still on
-- "today" while Postgres has already rolled over to tomorrow — so from ~20:00
-- local onwards a brand-new program was rejected with
-- "program start_date cannot be in the past", while the identical action
-- succeeded in the morning.
--
-- The guard exists to stop a coach BACK-DATING a block, not to police
-- timezones, so give it a one-day tolerance. That absorbs every UTC offset
-- (max ±14h) while still rejecting a genuinely back-dated start.
--
-- Idempotent (create or replace). Run in the Supabase SQL editor.
-- ==========================================================================

begin;

create or replace function public.guard_program_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Templates carry a placeholder start_date; only real assignments are held
  -- to "cannot start in the past".
  if new.is_template then
    return new;
  end if;

  if new.start_date < current_date - 1
     and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date)
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'program start_date cannot be in the past';
  end if;
  return new;
end;
$$;

commit;

-- Confirm the timezone gap this fixes:
--   select current_setting('TimeZone') as db_tz, current_date, now();

-- ==========================================================================
-- [26] 20260807120000_nutrition_plans.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coach Nutrition Plans: carb-cycled protocols (see docs/COACH-NUTRITION-SPEC.md).
-- Represents what a coach hands a client today as a PDF — meal slots, rotation
-- options within each slot, food items whose visibility depends on the DAY TYPE
-- (training vs rest), and a macro target table per day type.
--
-- Shape mirrors the programs graph one tier deeper, because the source document
-- has one:
--
--   nutrition_plans           <- programs           (user_id null => template)
--     nutrition_plan_targets  <- program_weeks      (macro targets per day type)
--     nutrition_plan_meals    <- program_days       (Desayuno, Almuerzo, ...)
--       nutrition_plan_options                      ("Opción 1", "Día 1-2")
--         ..._option_items    <- program_exercises  (food + quantity, NO macros)
--
-- day_type lives on the ITEM, not the option: "Almuerzo Día 1-2" is one option
-- holding arroz (training only) + pollo (both), so the same row shows two foods
-- on a training day and one on a rest day. That IS the carb cycling.
--
-- The coach prescribes WHAT to eat, never its macros. Macros are measured, not
-- prescribed: the client photographs the plate and the AI estimator fills
-- meal_items. The only numbers a coach enters are the plan-level TARGETS in
-- nutrition_plan_targets, which is what the measured intake is compared against.
--
-- Templates use the same convention as programs: a template is a plan row with
-- user_id IS NULL and is_template = true; assigning deep-copies the graph, so
-- editing the library never mutates a client's running phase.
--
-- Read-only to clients apart from the diary write-back (see meal_items.
-- plan_option_id at the bottom). Reuses the single-coach model from
-- 20260707120000_coaching_platform (is_coach(), client-self-scoped).
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql  (the user applies SQL there,
-- not via `supabase db push`).
-- ==========================================================================

begin;

-- 1) nutrition_plans — the protocol -----------------------------------------
--    user_id is NULLABLE: null means this row is a library template, which is
--    also why it can never leak to a client (the app fetches user_id = me).
create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,           -- client; null => template
  assigned_by uuid references public.profiles(id) on delete set null,      -- coach
  source text not null default 'coach' check (source in ('coach')),
  name text not null,
  description text,
  focus text,                              -- e.g. "Ciclado de carbohidratos"
  -- A nutrition phase is often open-ended, unlike a training block: null means
  -- "runs until replaced" and the client sees no week counter.
  duration_weeks int check (duration_weeks between 1 and 52),
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  -- false collapses the client UI to a single day type and the plan to one
  -- 'both' target row (a protocol without carb cycling).
  day_cycling boolean not null default true,
  notes text,
  is_template boolean not null default false,
  -- Provenance of an assigned copy. ON DELETE SET NULL: deleting a template must
  -- never cascade into a client's assigned plan.
  template_id uuid references public.nutrition_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A template has no client; an assigned plan must have one.
  constraint nutrition_plans_template_shape check (
    (is_template and user_id is null) or (not is_template and user_id is not null)
  )
);
create index if not exists idx_nutrition_plans_user     on public.nutrition_plans(user_id);
create index if not exists idx_nutrition_plans_assigned on public.nutrition_plans(assigned_by);
create index if not exists idx_nutrition_plans_template on public.nutrition_plans(template_id);
create index if not exists idx_nutrition_plans_is_template
  on public.nutrition_plans(is_template) where is_template;

-- 2) nutrition_plan_targets — the macro table per day type ------------------
--    'both' is the single row used when day_cycling is false.
create table if not exists public.nutrition_plan_targets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  day_type text not null check (day_type in ('both','training','rest')),
  kcal_min int check (kcal_min between 0 and 20000),
  kcal_max int check (kcal_max between 0 and 20000),
  protein_min_g numeric check (protein_min_g >= 0),
  protein_max_g numeric check (protein_max_g >= 0),
  carbs_min_g numeric check (carbs_min_g >= 0),
  carbs_max_g numeric check (carbs_max_g >= 0),
  fat_min_g numeric check (fat_min_g >= 0),
  fat_max_g numeric check (fat_max_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (plan_id, day_type),
  -- If both bounds are given, keep them ordered.
  constraint nutrition_target_kcal_order    check (kcal_min      is null or kcal_max      is null or kcal_min      <= kcal_max),
  constraint nutrition_target_protein_order check (protein_min_g is null or protein_max_g is null or protein_min_g <= protein_max_g),
  constraint nutrition_target_carbs_order   check (carbs_min_g   is null or carbs_max_g   is null or carbs_min_g   <= carbs_max_g),
  constraint nutrition_target_fat_order     check (fat_min_g     is null or fat_max_g     is null or fat_min_g     <= fat_max_g)
);
create index if not exists idx_nutrition_targets_plan on public.nutrition_plan_targets(plan_id);

-- 3) nutrition_plan_meals — the slots ---------------------------------------
--    meal_type carries six values, but meals.meal_type only allows four;
--    pre_workout/post_workout collapse to 'snack' on diary write-back (see
--    mealTypeToDiarySlot in src/utils/nutrition-plan.ts).
--    applies_to gates the whole slot: "POST-ENTRENAMIENTO (SOLO DÍAS DE
--    ENTRENAMIENTO)" is applies_to = 'training', and its notes carry the rest-day
--    substitution the client still needs to read.
create table if not exists public.nutrition_plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  slot_index int not null,                 -- 1..N, the order of the day
  label text,                              -- e.g. "Post-entrenamiento"
  meal_type text not null default 'snack' check (meal_type in
    ('breakfast','lunch','dinner','snack','pre_workout','post_workout')),
  time_hint text,                          -- e.g. "30-45 min antes de entrenar"
  applies_to text not null default 'both' check (applies_to in ('both','training','rest')),
  is_optional boolean not null default false,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (plan_id, slot_index)
);
create index if not exists idx_nutrition_meals_plan on public.nutrition_plan_meals(plan_id);

-- 4) nutrition_plan_options — the rotation tier -----------------------------
--    "Opción 1 / 2 / 3" or "Día 1-2 / Día 3-4". The client picks one.
create table if not exists public.nutrition_plan_options (
  id uuid primary key default gen_random_uuid(),
  plan_meal_id uuid not null references public.nutrition_plan_meals(id) on delete cascade,
  label text,                              -- e.g. "Día 1-2"
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_nutrition_options_meal on public.nutrition_plan_options(plan_meal_id);

-- 5) nutrition_plan_option_items — the leaf ---------------------------------
--    ONE free-text field for the food, plus the day type it survives on. No
--    quantity/amount/unit columns and no macro columns: the coach names the
--    food, and everything numeric about it is measured later from the client's
--    photo by the AI estimator (src/services/ai-nutrition.ts).
--
--    name being free text means a coach who WANTS to state a portion just types
--    it ("Arroz 110 g") — the column does not care, and no UI forces the issue.
--    A structured quantity would have forced it on every row.
--
--    Plan-level macro TARGETS still exist (nutrition_plan_targets above) — that
--    is what the measured intake gets compared against.
create table if not exists public.nutrition_plan_option_items (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.nutrition_plan_options(id) on delete cascade,
  name text not null,
  day_type text not null default 'both' check (day_type in ('both','training','rest')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_nutrition_items_option on public.nutrition_plan_option_items(option_id);

-- 6) Diary provenance --------------------------------------------------------
--    When a client taps "Registrar en mi diario", the resulting meal_items carry
--    the option they came from — that link is the whole adherence signal.
--
--    Deliberately NOT setting meals.assigned_by on those rows: the client is the
--    author and must stay able to correct the portion they actually ate. The
--    restrictive policies in 20260707120000_coaching_platform (99-107) would
--    otherwise make their own diary read-only to them.
alter table public.meal_items
  add column if not exists plan_option_id uuid
    references public.nutrition_plan_options(id) on delete set null;
create index if not exists idx_meal_items_plan_option
  on public.meal_items(plan_option_id) where plan_option_id is not null;

-- 7) start_date may not be in the past (API writers only) -------------------
--    Mirrors guard_program_start_date: templates are exempt (their start_date is
--    meaningless boilerplate), and direct DB / SQL-editor seeds (auth.uid() null)
--    plus the service role are exempt so fixtures can set any date.
create or replace function public.guard_nutrition_plan_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_template then
    return new;
  end if;
  if new.start_date < current_date
     and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date)
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'nutrition plan start_date cannot be in the past';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_nutrition_plan_start_date on public.nutrition_plans;
create trigger trg_guard_nutrition_plan_start_date
  before insert or update on public.nutrition_plans
  for each row execute function public.guard_nutrition_plan_start_date();

-- 8) One active plan per client ---------------------------------------------
--    The app fetches the single active plan (status='active' limit 1), so a
--    second active row would be silently hidden. Setting one active demotes the
--    client's others — activating the next phase just retires the previous one,
--    with no hard failure. Templates are exempt: for them 'active' means library
--    shelf-state, and their null user_id can never match the demotion filter.
create or replace function public.enforce_single_active_nutrition_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.user_id is not null then
    update public.nutrition_plans
       set status = 'archived', updated_at = now()
     where user_id = new.user_id
       and id <> new.id
       and status = 'active';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_single_active_nutrition_plan on public.nutrition_plans;
create trigger trg_enforce_single_active_nutrition_plan
  before insert or update of status on public.nutrition_plans
  for each row when (new.status = 'active')
  execute function public.enforce_single_active_nutrition_plan();

-- Backstop, enforced by the engine. Templates (null user_id) are excluded.
create unique index if not exists uniq_one_active_nutrition_plan_per_user
  on public.nutrition_plans (user_id)
  where status = 'active' and user_id is not null;

-- 9) RLS ---------------------------------------------------------------------
alter table public.nutrition_plans             enable row level security;
alter table public.nutrition_plan_targets      enable row level security;
alter table public.nutrition_plan_meals        enable row level security;
alter table public.nutrition_plan_options      enable row level security;
alter table public.nutrition_plan_option_items enable row level security;

-- Coach: full access to everything (single-coach model).
drop policy if exists "coach all nutrition_plans" on public.nutrition_plans;
create policy "coach all nutrition_plans" on public.nutrition_plans for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all nutrition_plan_targets" on public.nutrition_plan_targets;
create policy "coach all nutrition_plan_targets" on public.nutrition_plan_targets for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all nutrition_plan_meals" on public.nutrition_plan_meals;
create policy "coach all nutrition_plan_meals" on public.nutrition_plan_meals for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all nutrition_plan_options" on public.nutrition_plan_options;
create policy "coach all nutrition_plan_options" on public.nutrition_plan_options for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all nutrition_plan_option_items" on public.nutrition_plan_option_items;
create policy "coach all nutrition_plan_option_items" on public.nutrition_plan_option_items for all
  using (public.is_coach()) with check (public.is_coach());

-- Client: read-only on their own plan (no insert/update/delete). Children scope
-- through their parent; a template's null user_id never equals auth.uid(), so
-- the library is invisible to clients by construction.
drop policy if exists "client reads own nutrition_plans" on public.nutrition_plans;
create policy "client reads own nutrition_plans" on public.nutrition_plans for select
  using (user_id = auth.uid());
drop policy if exists "client reads own nutrition_plan_targets" on public.nutrition_plan_targets;
create policy "client reads own nutrition_plan_targets" on public.nutrition_plan_targets for select
  using (exists (select 1 from public.nutrition_plans p
                 where p.id = plan_id and p.user_id = auth.uid()));
drop policy if exists "client reads own nutrition_plan_meals" on public.nutrition_plan_meals;
create policy "client reads own nutrition_plan_meals" on public.nutrition_plan_meals for select
  using (exists (select 1 from public.nutrition_plans p
                 where p.id = plan_id and p.user_id = auth.uid()));
drop policy if exists "client reads own nutrition_plan_options" on public.nutrition_plan_options;
create policy "client reads own nutrition_plan_options" on public.nutrition_plan_options for select
  using (exists (select 1 from public.nutrition_plan_meals m
                 join public.nutrition_plans p on p.id = m.plan_id
                 where m.id = plan_meal_id and p.user_id = auth.uid()));
drop policy if exists "client reads own nutrition_plan_option_items" on public.nutrition_plan_option_items;
create policy "client reads own nutrition_plan_option_items" on public.nutrition_plan_option_items for select
  using (exists (select 1 from public.nutrition_plan_options o
                 join public.nutrition_plan_meals m on m.id = o.plan_meal_id
                 join public.nutrition_plans p on p.id = m.plan_id
                 where o.id = option_id and p.user_id = auth.uid()));

-- 10) Grants -----------------------------------------------------------------
grant select, insert, update, delete on public.nutrition_plans             to authenticated;
grant select, insert, update, delete on public.nutrition_plan_targets      to authenticated;
grant select, insert, update, delete on public.nutrition_plan_meals        to authenticated;
grant select, insert, update, delete on public.nutrition_plan_options      to authenticated;
grant select, insert, update, delete on public.nutrition_plan_option_items to authenticated;

-- 11) save_nutrition_plan — the whole graph in one transaction ---------------
--     p_client_id NULL means "save a template", exactly as save_coach_program
--     does. Editing replaces the child graph wholesale (delete + reinsert), so a
--     partially-saved plan is impossible.
create or replace function public.save_nutrition_plan(
  p_plan_id   uuid,
  p_client_id uuid,   -- NULL => template
  p_header    jsonb,
  p_targets   jsonb,
  p_meals     jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_plan_id     uuid;
  v_meal        jsonb;
  v_meal_id     uuid;
  v_option      jsonb;
  v_option_id   uuid;
  v_is_template boolean := p_client_id is null;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage nutrition plans' using errcode = '42501';
  end if;

  if p_plan_id is null then
    insert into public.nutrition_plans
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, day_cycling, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       nullif(p_header->>'duration_weeks', '')::int,
       coalesce((p_header->>'start_date')::date, current_date),
       -- For a TEMPLATE, status means library shelf-state: 'active' = available
       -- to assign, 'archived' = retired (templates are never deleted). It can
       -- never collide with the one-active-per-CLIENT rule, since that index and
       -- trigger both ignore rows with a null user_id.
       coalesce(nullif(p_header->>'status', ''), 'active'),
       coalesce((p_header->>'day_cycling')::boolean, true),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_plan_id;
  else
    update public.nutrition_plans set
       name           = p_header->>'name',
       description    = nullif(p_header->>'description', ''),
       focus          = nullif(p_header->>'focus', ''),
       duration_weeks = nullif(p_header->>'duration_weeks', '')::int,
       start_date     = coalesce((p_header->>'start_date')::date, start_date),
       status         = case when is_template then status
                             else coalesce(nullif(p_header->>'status', ''), 'active') end,
       day_cycling    = coalesce((p_header->>'day_cycling')::boolean, day_cycling),
       notes          = nullif(p_header->>'notes', ''),
       updated_at     = now()
     where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Nutrition plan % not found', p_plan_id using errcode = 'no_data_found';
    end if;

    -- Options and items cascade from meals; targets are their own branch.
    delete from public.nutrition_plan_meals   where plan_id = v_plan_id;
    delete from public.nutrition_plan_targets where plan_id = v_plan_id;
  end if;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_plan_id,
      coalesce(nullif(t->>'day_type', ''), 'both'),
      nullif(t->>'kcal_min', '')::int,
      nullif(t->>'kcal_max', '')::int,
      nullif(t->>'protein_min_g', '')::numeric,
      nullif(t->>'protein_max_g', '')::numeric,
      nullif(t->>'carbs_min_g', '')::numeric,
      nullif(t->>'carbs_max_g', '')::numeric,
      nullif(t->>'fat_min_g', '')::numeric,
      nullif(t->>'fat_max_g', '')::numeric,
      nullif(t->>'notes', '')
  from jsonb_array_elements(coalesce(p_targets, '[]'::jsonb)) as t;

  for v_meal in select * from jsonb_array_elements(coalesce(p_meals, '[]'::jsonb))
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_plan_id,
        (v_meal->>'slot_index')::int,
        nullif(v_meal->>'label', ''),
        coalesce(nullif(v_meal->>'meal_type', ''), 'snack'),
        nullif(v_meal->>'time_hint', ''),
        coalesce(nullif(v_meal->>'applies_to', ''), 'both'),
        coalesce((v_meal->>'is_optional')::boolean, false),
        nullif(v_meal->>'notes', ''),
        coalesce((v_meal->>'sort_order')::int, 0))
    returning id into v_meal_id;

    for v_option in select * from jsonb_array_elements(coalesce(v_meal->'options', '[]'::jsonb))
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id,
          nullif(v_option->>'label', ''),
          nullif(v_option->>'notes', ''),
          coalesce((v_option->>'sort_order')::int, 0))
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id,
          i->>'name',
          coalesce(nullif(i->>'day_type', ''), 'both'),
          coalesce((i->>'sort_order')::int, 0)
      from jsonb_array_elements(coalesce(v_option->'items', '[]'::jsonb)) as i
      where coalesce(btrim(i->>'name'), '') <> '';
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

revoke all     on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant  execute on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

-- 12) Assign a template to a client: deep-copy the whole graph ---------------
--     The copy is a snapshot (later template edits don't touch it) and becomes
--     the client's ACTIVE plan — the single-active trigger auto-archives
--     whatever they were on before.
create or replace function public.assign_nutrition_plan_template(
  p_template_id uuid,
  p_client_id   uuid,
  p_start_date  date default current_date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id    uuid;
  v_meal      record;
  v_meal_id   uuid;
  v_option    record;
  v_option_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign nutrition plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.nutrition_plans
                  where id = p_template_id and is_template) then
    raise exception 'Nutrition template % not found', p_template_id using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.nutrition_plans
              where id = p_template_id and is_template and status <> 'active') then
    raise exception 'Nutrition template % is archived — restore it before assigning', p_template_id;
  end if;

  insert into public.nutrition_plans
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, day_cycling, notes, is_template, template_id)
  select p_client_id, auth.uid(), 'coach', t.name, t.description, t.focus,
         t.duration_weeks, coalesce(p_start_date, current_date), 'active',
         t.day_cycling, t.notes, false, t.id
    from public.nutrition_plans t
   where t.id = p_template_id
  returning id into v_new_id;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_new_id, t.day_type, t.kcal_min, t.kcal_max, t.protein_min_g, t.protein_max_g,
         t.carbs_min_g, t.carbs_max_g, t.fat_min_g, t.fat_max_g, t.notes
    from public.nutrition_plan_targets t
   where t.plan_id = p_template_id;

  for v_meal in
    select * from public.nutrition_plan_meals
     where plan_id = p_template_id order by sort_order, slot_index
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_new_id, v_meal.slot_index, v_meal.label, v_meal.meal_type, v_meal.time_hint,
            v_meal.applies_to, v_meal.is_optional, v_meal.notes, v_meal.sort_order)
    returning id into v_meal_id;

    for v_option in
      select * from public.nutrition_plan_options
       where plan_meal_id = v_meal.id order by sort_order
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id, v_option.label, v_option.notes, v_option.sort_order)
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id, i.name, i.day_type, i.sort_order
        from public.nutrition_plan_option_items i
       where i.option_id = v_option.id;
    end loop;
  end loop;

  return v_new_id;
end;
$$;

revoke all     on function public.assign_nutrition_plan_template(uuid, uuid, date) from public;
grant  execute on function public.assign_nutrition_plan_template(uuid, uuid, date) to authenticated;

-- 13) Promote a client's one-off plan into a reusable template ---------------
--     The mirror of assign_nutrition_plan_template: copies the graph back out
--     into an ownerless library entry. The source plan is left untouched apart
--     from claiming its provenance.
create or replace function public.save_nutrition_plan_as_template(
  p_plan_id uuid,
  p_name    text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id    uuid;
  v_meal      record;
  v_meal_id   uuid;
  v_option    record;
  v_option_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage nutrition plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.nutrition_plans where id = p_plan_id) then
    raise exception 'Nutrition plan % not found', p_plan_id using errcode = 'no_data_found';
  end if;

  insert into public.nutrition_plans
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, day_cycling, notes, is_template, template_id)
  select null, auth.uid(), 'coach',
         coalesce(nullif(btrim(p_name), ''), p.name),
         p.description, p.focus, p.duration_weeks,
         current_date, 'active',
         p.day_cycling, p.notes, true, null
    from public.nutrition_plans p
   where p.id = p_plan_id
  returning id into v_new_id;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_new_id, t.day_type, t.kcal_min, t.kcal_max, t.protein_min_g, t.protein_max_g,
         t.carbs_min_g, t.carbs_max_g, t.fat_min_g, t.fat_max_g, t.notes
    from public.nutrition_plan_targets t
   where t.plan_id = p_plan_id;

  for v_meal in
    select * from public.nutrition_plan_meals
     where plan_id = p_plan_id order by sort_order, slot_index
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_new_id, v_meal.slot_index, v_meal.label, v_meal.meal_type, v_meal.time_hint,
            v_meal.applies_to, v_meal.is_optional, v_meal.notes, v_meal.sort_order)
    returning id into v_meal_id;

    for v_option in
      select * from public.nutrition_plan_options
       where plan_meal_id = v_meal.id order by sort_order
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id, v_option.label, v_option.notes, v_option.sort_order)
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id, i.name, i.day_type, i.sort_order
        from public.nutrition_plan_option_items i
       where i.option_id = v_option.id;
    end loop;
  end loop;

  -- Claim the source plan for the new template. Without this the client who
  -- inspired the template wouldn't appear under "Clientes asignados" — they ARE
  -- running it, so the library should say so. Only ever fills a null.
  update public.nutrition_plans
     set template_id = v_new_id, updated_at = now()
   where id = p_plan_id
     and template_id is null
     and not is_template;

  return v_new_id;
end;
$$;

revoke all     on function public.save_nutrition_plan_as_template(uuid, text) from public;
grant  execute on function public.save_nutrition_plan_as_template(uuid, text) to authenticated;

commit;

-- Verify:
--   select count(*) from public.nutrition_plans where is_template;   -- library size
--   select name, user_id, template_id, status from public.nutrition_plans
--     order by created_at desc limit 5;
--   -- a plan's full graph:
--   select m.slot_index, m.label, o.label, i.name, i.quantity, i.day_type
--     from public.nutrition_plan_meals m
--     join public.nutrition_plan_options o on o.plan_meal_id = m.id
--     join public.nutrition_plan_option_items i on i.option_id = o.id
--    where m.plan_id = '<plan-id>'
--    order by m.slot_index, o.sort_order, i.sort_order;

-- ==========================================================================
-- [27] 20260807120100_supplement_plans.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Coach Supplement Plans (see docs/COACH-NUTRITION-SPEC.md).
--
-- The second half of the coach's nutrition document, kept as a SEPARATE
-- assignable plan: a coach swaps diets far more often than they swap supplement
-- stacks, so binding the two would force a rebuild every phase.
--
-- Flatter than the nutrition graph — a plan is just a tiered list:
--
--   supplement_plans          <- nutrition_plans  (user_id null => template)
--     supplement_plan_items                       (name, tier, dose, timing)
--
-- The source document's closing "RECOMENDACIONES DE HORARIO DE SUPLEMENTACION"
-- table is NOT stored: it is a `group by timing_slot` over these rows. That
-- falls out for free — Cafeína and Citrulina both sit at timing_slot
-- 'pre_workout' with applies_to 'training', so they collapse into one
-- "Pre-entreno (30-45 min)" line and drop off entirely on a rest day.
--
-- Same conventions as 20260807120000_nutrition_plans: templates via a null
-- user_id, deep-copy on assign, one active plan per client, coach-writes /
-- client-reads RLS from 20260707120000_coaching_platform.
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/_/sql  (the user applies SQL there,
-- not via `supabase db push`).
-- ==========================================================================

begin;

-- 1) supplement_plans — the stack --------------------------------------------
create table if not exists public.supplement_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,           -- client; null => template
  assigned_by uuid references public.profiles(id) on delete set null,      -- coach
  source text not null default 'coach' check (source in ('coach')),
  name text not null,
  description text,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  notes text,
  is_template boolean not null default false,
  template_id uuid references public.supplement_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplement_plans_template_shape check (
    (is_template and user_id is null) or (not is_template and user_id is not null)
  )
);
create index if not exists idx_supplement_plans_user     on public.supplement_plans(user_id);
create index if not exists idx_supplement_plans_assigned on public.supplement_plans(assigned_by);
create index if not exists idx_supplement_plans_template on public.supplement_plans(template_id);
create index if not exists idx_supplement_plans_is_template
  on public.supplement_plans(is_template) where is_template;

-- 2) supplement_plan_items ---------------------------------------------------
--    tier mirrors the document's three sections: A. base (obligatorios),
--    B. conditional (según tolerancia), C. optional (menor prioridad).
--    timing_slot is the enum the schedule table groups by; timing_note keeps the
--    coach's own phrasing ("Cualquier horario fijo, preferible post-entreno").
create table if not exists public.supplement_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.supplement_plans(id) on delete cascade,
  name text not null,                      -- e.g. "Creatina Monohidrato"
  tier text not null default 'base' check (tier in ('base','conditional','optional')),
  dose text,                               -- e.g. "5 g al día"
  timing_slot text not null default 'any' check (timing_slot in
    ('wake','breakfast','pre_workout','intra_workout','post_workout',
     'lunch','dinner','bedtime','any')),
  timing_note text,
  purpose text,                            -- e.g. "Mejorar fuerza y volumen muscular"
  notes text,                              -- e.g. "No requiere fase de carga"
  applies_to text not null default 'both' check (applies_to in ('both','training','rest')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_supplement_items_plan on public.supplement_plan_items(plan_id);

-- 3) start_date may not be in the past (API writers only) -------------------
--    Mirrors guard_nutrition_plan_start_date exactly.
create or replace function public.guard_supplement_plan_start_date()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_template then
    return new;
  end if;
  if new.start_date < current_date
     and (tg_op = 'INSERT' or new.start_date is distinct from old.start_date)
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'supplement plan start_date cannot be in the past';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_supplement_plan_start_date on public.supplement_plans;
create trigger trg_guard_supplement_plan_start_date
  before insert or update on public.supplement_plans
  for each row execute function public.guard_supplement_plan_start_date();

-- 4) One active plan per client ---------------------------------------------
create or replace function public.enforce_single_active_supplement_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and new.user_id is not null then
    update public.supplement_plans
       set status = 'archived', updated_at = now()
     where user_id = new.user_id
       and id <> new.id
       and status = 'active';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_enforce_single_active_supplement_plan on public.supplement_plans;
create trigger trg_enforce_single_active_supplement_plan
  before insert or update of status on public.supplement_plans
  for each row when (new.status = 'active')
  execute function public.enforce_single_active_supplement_plan();

create unique index if not exists uniq_one_active_supplement_plan_per_user
  on public.supplement_plans (user_id)
  where status = 'active' and user_id is not null;

-- 5) RLS ---------------------------------------------------------------------
alter table public.supplement_plans      enable row level security;
alter table public.supplement_plan_items enable row level security;

drop policy if exists "coach all supplement_plans" on public.supplement_plans;
create policy "coach all supplement_plans" on public.supplement_plans for all
  using (public.is_coach()) with check (public.is_coach());
drop policy if exists "coach all supplement_plan_items" on public.supplement_plan_items;
create policy "coach all supplement_plan_items" on public.supplement_plan_items for all
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "client reads own supplement_plans" on public.supplement_plans;
create policy "client reads own supplement_plans" on public.supplement_plans for select
  using (user_id = auth.uid());
drop policy if exists "client reads own supplement_plan_items" on public.supplement_plan_items;
create policy "client reads own supplement_plan_items" on public.supplement_plan_items for select
  using (exists (select 1 from public.supplement_plans p
                 where p.id = plan_id and p.user_id = auth.uid()));

-- 6) Grants ------------------------------------------------------------------
grant select, insert, update, delete on public.supplement_plans      to authenticated;
grant select, insert, update, delete on public.supplement_plan_items to authenticated;

-- 7) save_supplement_plan ----------------------------------------------------
--    p_client_id NULL means "save a template".
create or replace function public.save_supplement_plan(
  p_plan_id   uuid,
  p_client_id uuid,   -- NULL => template
  p_header    jsonb,
  p_items     jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_plan_id     uuid;
  v_is_template boolean := p_client_id is null;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage supplement plans' using errcode = '42501';
  end if;

  if p_plan_id is null then
    insert into public.supplement_plans
      (user_id, assigned_by, source, name, description, start_date, status, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       coalesce((p_header->>'start_date')::date, current_date),
       coalesce(nullif(p_header->>'status', ''), 'active'),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_plan_id;
  else
    update public.supplement_plans set
       name        = p_header->>'name',
       description = nullif(p_header->>'description', ''),
       start_date  = coalesce((p_header->>'start_date')::date, start_date),
       status      = case when is_template then status
                          else coalesce(nullif(p_header->>'status', ''), 'active') end,
       notes       = nullif(p_header->>'notes', ''),
       updated_at  = now()
     where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Supplement plan % not found', p_plan_id using errcode = 'no_data_found';
    end if;

    delete from public.supplement_plan_items where plan_id = v_plan_id;
  end if;

  insert into public.supplement_plan_items
    (plan_id, name, tier, dose, timing_slot, timing_note, purpose, notes,
     applies_to, sort_order)
  select v_plan_id,
      s->>'name',
      coalesce(nullif(s->>'tier', ''), 'base'),
      nullif(s->>'dose', ''),
      coalesce(nullif(s->>'timing_slot', ''), 'any'),
      nullif(s->>'timing_note', ''),
      nullif(s->>'purpose', ''),
      nullif(s->>'notes', ''),
      coalesce(nullif(s->>'applies_to', ''), 'both'),
      coalesce((s->>'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as s
  where coalesce(btrim(s->>'name'), '') <> '';

  return v_plan_id;
end;
$$;

revoke all     on function public.save_supplement_plan(uuid, uuid, jsonb, jsonb) from public;
grant  execute on function public.save_supplement_plan(uuid, uuid, jsonb, jsonb) to authenticated;

-- 8) Assign a template to a client -------------------------------------------
create or replace function public.assign_supplement_plan_template(
  p_template_id uuid,
  p_client_id   uuid,
  p_start_date  date default current_date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign supplement plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.supplement_plans
                  where id = p_template_id and is_template) then
    raise exception 'Supplement template % not found', p_template_id using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.supplement_plans
              where id = p_template_id and is_template and status <> 'active') then
    raise exception 'Supplement template % is archived — restore it before assigning', p_template_id;
  end if;

  insert into public.supplement_plans
    (user_id, assigned_by, source, name, description, start_date, status, notes,
     is_template, template_id)
  select p_client_id, auth.uid(), 'coach', t.name, t.description,
         coalesce(p_start_date, current_date), 'active', t.notes, false, t.id
    from public.supplement_plans t
   where t.id = p_template_id
  returning id into v_new_id;

  insert into public.supplement_plan_items
    (plan_id, name, tier, dose, timing_slot, timing_note, purpose, notes,
     applies_to, sort_order)
  select v_new_id, i.name, i.tier, i.dose, i.timing_slot, i.timing_note, i.purpose,
         i.notes, i.applies_to, i.sort_order
    from public.supplement_plan_items i
   where i.plan_id = p_template_id;

  return v_new_id;
end;
$$;

revoke all     on function public.assign_supplement_plan_template(uuid, uuid, date) from public;
grant  execute on function public.assign_supplement_plan_template(uuid, uuid, date) to authenticated;

-- 9) Promote a client's one-off plan into a reusable template -----------------
create or replace function public.save_supplement_plan_as_template(
  p_plan_id uuid,
  p_name    text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage supplement plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.supplement_plans where id = p_plan_id) then
    raise exception 'Supplement plan % not found', p_plan_id using errcode = 'no_data_found';
  end if;

  insert into public.supplement_plans
    (user_id, assigned_by, source, name, description, start_date, status, notes,
     is_template, template_id)
  select null, auth.uid(), 'coach',
         coalesce(nullif(btrim(p_name), ''), p.name),
         p.description, current_date, 'active', p.notes, true, null
    from public.supplement_plans p
   where p.id = p_plan_id
  returning id into v_new_id;

  insert into public.supplement_plan_items
    (plan_id, name, tier, dose, timing_slot, timing_note, purpose, notes,
     applies_to, sort_order)
  select v_new_id, i.name, i.tier, i.dose, i.timing_slot, i.timing_note, i.purpose,
         i.notes, i.applies_to, i.sort_order
    from public.supplement_plan_items i
   where i.plan_id = p_plan_id;

  -- Claim the source plan for the new template (only ever fills a null), so the
  -- client who inspired it shows under "Clientes asignados".
  update public.supplement_plans
     set template_id = v_new_id, updated_at = now()
   where id = p_plan_id
     and template_id is null
     and not is_template;

  return v_new_id;
end;
$$;

revoke all     on function public.save_supplement_plan_as_template(uuid, text) from public;
grant  execute on function public.save_supplement_plan_as_template(uuid, text) to authenticated;

commit;

-- Verify:
--   select count(*) from public.supplement_plans where is_template;  -- library size
--   -- the schedule table the PDF ends with, derived:
--   select timing_slot, string_agg(name || coalesce(' — ' || dose, ''), ' + '
--                                  order by sort_order) as stack
--     from public.supplement_plan_items
--    where plan_id = '<plan-id>' and applies_to in ('both','training')
--    group by timing_slot;

-- ==========================================================================
-- [28] 20260807120200_nutrition_items_drop_quantity.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Drop nutrition_plan_option_items.quantity.
--
-- The coach names the food and nothing else — no quantity, amount, or unit.
-- Everything numeric about a meal is measured from the client's photo by the AI
-- estimator (src/services/ai-nutrition.ts), never prescribed.
--
-- A coach who WANTS to state a portion still can: name is free text, so
-- "Arroz 110 g" is a legal food name. Keeping a structured quantity column
-- would have forced the decision onto every row of every plan instead.
--
-- Only needed on a database that already applied 20260807120000 in its earlier
-- form. On a fresh database that file no longer creates the column and the drop
-- below is a harmless no-op — both paths converge on the same schema.
--
-- Replaces the three RPCs that referenced the column, so this file is the only
-- thing that needs pasting. Additive, idempotent, drift-safe. Run in the
-- Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.nutrition_plan_option_items drop column if exists quantity;

-- 1) save_nutrition_plan ------------------------------------------------------
create or replace function public.save_nutrition_plan(
  p_plan_id   uuid,
  p_client_id uuid,   -- NULL => template
  p_header    jsonb,
  p_targets   jsonb,
  p_meals     jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_plan_id     uuid;
  v_meal        jsonb;
  v_meal_id     uuid;
  v_option      jsonb;
  v_option_id   uuid;
  v_is_template boolean := p_client_id is null;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage nutrition plans' using errcode = '42501';
  end if;

  if p_plan_id is null then
    insert into public.nutrition_plans
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, day_cycling, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       nullif(p_header->>'duration_weeks', '')::int,
       coalesce((p_header->>'start_date')::date, current_date),
       coalesce(nullif(p_header->>'status', ''), 'active'),
       coalesce((p_header->>'day_cycling')::boolean, true),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_plan_id;
  else
    update public.nutrition_plans set
       name           = p_header->>'name',
       description    = nullif(p_header->>'description', ''),
       focus          = nullif(p_header->>'focus', ''),
       duration_weeks = nullif(p_header->>'duration_weeks', '')::int,
       start_date     = coalesce((p_header->>'start_date')::date, start_date),
       status         = case when is_template then status
                             else coalesce(nullif(p_header->>'status', ''), 'active') end,
       day_cycling    = coalesce((p_header->>'day_cycling')::boolean, day_cycling),
       notes          = nullif(p_header->>'notes', ''),
       updated_at     = now()
     where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Nutrition plan % not found', p_plan_id using errcode = 'no_data_found';
    end if;

    delete from public.nutrition_plan_meals   where plan_id = v_plan_id;
    delete from public.nutrition_plan_targets where plan_id = v_plan_id;
  end if;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_plan_id,
      coalesce(nullif(t->>'day_type', ''), 'both'),
      nullif(t->>'kcal_min', '')::int,
      nullif(t->>'kcal_max', '')::int,
      nullif(t->>'protein_min_g', '')::numeric,
      nullif(t->>'protein_max_g', '')::numeric,
      nullif(t->>'carbs_min_g', '')::numeric,
      nullif(t->>'carbs_max_g', '')::numeric,
      nullif(t->>'fat_min_g', '')::numeric,
      nullif(t->>'fat_max_g', '')::numeric,
      nullif(t->>'notes', '')
  from jsonb_array_elements(coalesce(p_targets, '[]'::jsonb)) as t;

  for v_meal in select * from jsonb_array_elements(coalesce(p_meals, '[]'::jsonb))
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_plan_id,
        (v_meal->>'slot_index')::int,
        nullif(v_meal->>'label', ''),
        coalesce(nullif(v_meal->>'meal_type', ''), 'snack'),
        nullif(v_meal->>'time_hint', ''),
        coalesce(nullif(v_meal->>'applies_to', ''), 'both'),
        coalesce((v_meal->>'is_optional')::boolean, false),
        nullif(v_meal->>'notes', ''),
        coalesce((v_meal->>'sort_order')::int, 0))
    returning id into v_meal_id;

    for v_option in select * from jsonb_array_elements(coalesce(v_meal->'options', '[]'::jsonb))
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id,
          nullif(v_option->>'label', ''),
          nullif(v_option->>'notes', ''),
          coalesce((v_option->>'sort_order')::int, 0))
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id,
          i->>'name',
          coalesce(nullif(i->>'day_type', ''), 'both'),
          coalesce((i->>'sort_order')::int, 0)
      from jsonb_array_elements(coalesce(v_option->'items', '[]'::jsonb)) as i
      where coalesce(btrim(i->>'name'), '') <> '';
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

revoke all     on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant  execute on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

-- 2) assign_nutrition_plan_template ------------------------------------------
create or replace function public.assign_nutrition_plan_template(
  p_template_id uuid,
  p_client_id   uuid,
  p_start_date  date default current_date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id    uuid;
  v_meal      record;
  v_meal_id   uuid;
  v_option    record;
  v_option_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign nutrition plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.nutrition_plans
                  where id = p_template_id and is_template) then
    raise exception 'Nutrition template % not found', p_template_id using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.nutrition_plans
              where id = p_template_id and is_template and status <> 'active') then
    raise exception 'Nutrition template % is archived — restore it before assigning', p_template_id;
  end if;

  insert into public.nutrition_plans
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, day_cycling, notes, is_template, template_id)
  select p_client_id, auth.uid(), 'coach', t.name, t.description, t.focus,
         t.duration_weeks, coalesce(p_start_date, current_date), 'active',
         t.day_cycling, t.notes, false, t.id
    from public.nutrition_plans t
   where t.id = p_template_id
  returning id into v_new_id;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_new_id, t.day_type, t.kcal_min, t.kcal_max, t.protein_min_g, t.protein_max_g,
         t.carbs_min_g, t.carbs_max_g, t.fat_min_g, t.fat_max_g, t.notes
    from public.nutrition_plan_targets t
   where t.plan_id = p_template_id;

  for v_meal in
    select * from public.nutrition_plan_meals
     where plan_id = p_template_id order by sort_order, slot_index
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_new_id, v_meal.slot_index, v_meal.label, v_meal.meal_type, v_meal.time_hint,
            v_meal.applies_to, v_meal.is_optional, v_meal.notes, v_meal.sort_order)
    returning id into v_meal_id;

    for v_option in
      select * from public.nutrition_plan_options
       where plan_meal_id = v_meal.id order by sort_order
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id, v_option.label, v_option.notes, v_option.sort_order)
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id, i.name, i.day_type, i.sort_order
        from public.nutrition_plan_option_items i
       where i.option_id = v_option.id;
    end loop;
  end loop;

  return v_new_id;
end;
$$;

revoke all     on function public.assign_nutrition_plan_template(uuid, uuid, date) from public;
grant  execute on function public.assign_nutrition_plan_template(uuid, uuid, date) to authenticated;

-- 3) save_nutrition_plan_as_template -----------------------------------------
create or replace function public.save_nutrition_plan_as_template(
  p_plan_id uuid,
  p_name    text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id    uuid;
  v_meal      record;
  v_meal_id   uuid;
  v_option    record;
  v_option_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage nutrition plans' using errcode = '42501';
  end if;

  if not exists (select 1 from public.nutrition_plans where id = p_plan_id) then
    raise exception 'Nutrition plan % not found', p_plan_id using errcode = 'no_data_found';
  end if;

  insert into public.nutrition_plans
    (user_id, assigned_by, source, name, description, focus, duration_weeks,
     start_date, status, day_cycling, notes, is_template, template_id)
  select null, auth.uid(), 'coach',
         coalesce(nullif(btrim(p_name), ''), p.name),
         p.description, p.focus, p.duration_weeks,
         current_date, 'active',
         p.day_cycling, p.notes, true, null
    from public.nutrition_plans p
   where p.id = p_plan_id
  returning id into v_new_id;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_new_id, t.day_type, t.kcal_min, t.kcal_max, t.protein_min_g, t.protein_max_g,
         t.carbs_min_g, t.carbs_max_g, t.fat_min_g, t.fat_max_g, t.notes
    from public.nutrition_plan_targets t
   where t.plan_id = p_plan_id;

  for v_meal in
    select * from public.nutrition_plan_meals
     where plan_id = p_plan_id order by sort_order, slot_index
  loop
    insert into public.nutrition_plan_meals
      (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
       notes, sort_order)
    values (v_new_id, v_meal.slot_index, v_meal.label, v_meal.meal_type, v_meal.time_hint,
            v_meal.applies_to, v_meal.is_optional, v_meal.notes, v_meal.sort_order)
    returning id into v_meal_id;

    for v_option in
      select * from public.nutrition_plan_options
       where plan_meal_id = v_meal.id order by sort_order
    loop
      insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
      values (v_meal_id, v_option.label, v_option.notes, v_option.sort_order)
      returning id into v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id, i.name, i.day_type, i.sort_order
        from public.nutrition_plan_option_items i
       where i.option_id = v_option.id;
    end loop;
  end loop;

  update public.nutrition_plans
     set template_id = v_new_id, updated_at = now()
   where id = p_plan_id
     and template_id is null
     and not is_template;

  return v_new_id;
end;
$$;

revoke all     on function public.save_nutrition_plan_as_template(uuid, text) from public;
grant  execute on function public.save_nutrition_plan_as_template(uuid, text) to authenticated;

commit;

-- Verify:
--   select column_name from information_schema.columns
--    where table_name = 'nutrition_plan_option_items' order by ordinal_position;
--   -- expect: id, option_id, name, day_type, sort_order, created_at

-- ==========================================================================
-- [29] 20260807130000_realtime_coach_content.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Realtime for coach-assigned content.
--
-- The problem: a coach edits a program in the admin panel and the client's app
-- keeps showing the old one until they pull to refresh or leave and re-enter
-- the tab. On web there is no pull-to-refresh at all, so it looks stuck.
--
-- This puts the parent rows on the `supabase_realtime` publication so the app
-- can subscribe and invalidate its cache the moment the coach saves.
--
-- WHY ONLY THE PARENTS: every write path touches the parent row.
-- save_coach_program / save_nutrition_plan / save_supplement_plan all set
-- `updated_at = now()` on update, and assign/status/delete change it by
-- definition. Publishing the child tables too (program_exercises,
-- nutrition_plan_option_items, …) would multiply WAL traffic and fire a burst
-- of events for a single save, since those are rewritten row-by-row.
--
-- REPLICA IDENTITY FULL is required for DELETE: without it Postgres only ships
-- the primary key in the old-row image, so a subscription filtered on
-- `user_id=eq.<me>` can never match a delete and the client would keep showing
-- a program that no longer exists. These tables are written a handful of times
-- a week, so the extra WAL is irrelevant here.
--
-- RLS still applies to realtime — a client only ever receives rows their
-- existing "client reads own …" policies already let them SELECT.
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

-- 1) Full old-row images so DELETE events carry user_id for filtering.
alter table public.programs          replica identity full;
alter table public.nutrition_plans   replica identity full;
alter table public.supplement_plans  replica identity full;

-- 2) Add to the realtime publication, skipping any that are already on it
--    (`alter publication … add table` errors on duplicates, so guard each).
do $$
declare
  t text;
begin
  foreach t in array array['programs', 'nutrition_plans', 'supplement_plans']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      -- RAISE takes a single % per argument (unlike format's %I/%s).
      raise notice 'added % to supabase_realtime', t;
    end if;
  end loop;
end $$;

commit;

-- Verify — expect three rows:
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--      and tablename in ('programs','nutrition_plans','supplement_plans')
--    order by tablename;

-- ==========================================================================
-- [30] 20260826120000_zyron_app_scope.sql   (from zenfit)
-- ==========================================================================
-- ==========================================================================
-- App scope for the SHARED database.
--
-- Two mobile apps now point at this same Supabase project:
--   'hokage' — the original coaching app (coach-managed clients)
--   'zyron'  — the second app, which has BOTH self-serve users and
--              coach-assigned ones
--
-- `account_type` ('coached' | 'solo') already exists but answers a different
-- question — *is this person coach-managed?* — and Zyron needs both kinds. So
-- it can't double as the app separator. This column is the orthogonal axis:
-- which app the profile belongs to, and therefore which admin panel lists it.
--
--   Hokage panel  ->  account_type = 'coached' AND app = 'hokage'
--   Zyron panel   ->  app = 'zyron'
--
-- The Zyron app self-tags `app = 'zyron'` right after signup, through the
-- existing "users update own profile" policy — no new RLS needed. Adding the
-- column NOT NULL with a default backfills every existing row to 'hokage' in
-- one shot, so no data step.
--
-- NOTE ON is_coach(): it is still GLOBAL — any profile with role = 'coach'
-- reads and writes every client of BOTH apps. That is fine while a single
-- person coaches both. The day Zyron gets its own coach account, this needs a
-- coach->client ownership column and an RLS rewrite; this column alone does
-- not isolate the two coaching practices.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.profiles
  add column if not exists app text not null default 'hokage'
    check (app in ('hokage', 'zyron'));

comment on column public.profiles.app is
  'Which mobile app this profile belongs to. hokage = original coaching app; zyron = second app (self-serve + coach-assigned). Each admin panel filters on it. Orthogonal to account_type.';

-- The panels list clients by app, so the filter deserves an index.
create index if not exists idx_profiles_app on public.profiles(app);

commit;

-- Verify — expect every pre-existing profile on 'hokage':
--   select app, account_type, count(*)
--     from public.profiles group by 1, 2 order by 1, 2;

-- ==========================================================================
-- [31] 20260826120100_realtime_coach_routines.sql   (from zenfit)
-- ==========================================================================
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

-- ==========================================================================
-- [32] 20260827120000_routine_templates.sql   (from zenfit)
-- ==========================================================================
-- ==========================================================================
-- Routine TEMPLATES (reusable blueprints) + assignment provenance.
--
-- The Zyron admin panel assigns ROUTINES, not programs. Until now every coach
-- routine was authored per client, so running the same "Push Day" with ten
-- clients meant rebuilding it ten times. This ports the template pattern that
-- programs / nutrition_plans / supplement_plans already use:
--
--   * a TEMPLATE is a routines row with user_id IS NULL and is_template = true
--     (no client, never visible to any client);
--   * ASSIGNING deep-copies the routine into a new per-client row stamped with
--     template_id, so the panel can answer "which clients are on this?";
--   * editing a template therefore NEVER mutates a client's running routine --
--     the copy is a snapshot.
--
-- Routines are FLAT (routine -> exercises), so every place the programs version
-- loops over program_days collapses here into one set-based insert.
--
-- Client-facing behaviour is unchanged. Every client policy on both tables is
-- `auth.uid() = user_id`; with user_id NULL that comparison is NULL, so
-- templates are invisible to clients BY CONSTRUCTION and need no new RLS. The
-- same evaluation blocks a client from forging one: inserting
-- (user_id = null, is_template = true) fails the permissive insert policy.
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

-- 1) Columns -----------------------------------------------------------------
alter table public.routines
  add column if not exists is_template boolean not null default false;

-- Provenance of an assigned copy. ON DELETE SET NULL: deleting a template must
-- never cascade into a client's assigned routine.
alter table public.routines
  add column if not exists template_id uuid references public.routines(id) on delete set null;

-- Templates have no client. Note both columns keep their DEFAULT auth.uid(),
-- so the RPCs below must pass NULL *explicitly* -- omitting the column would
-- silently stamp the coach as the owner.
alter table public.routines          alter column user_id drop not null;

-- The child follows the parent's convention. Stuffing the coach's id here
-- instead would mean any future "all routine_exercises for user X" query
-- silently picks up library rows. There is deliberately no cross-table CHECK
-- (Postgres cannot); the RPCs own that invariant.
alter table public.routine_exercises alter column user_id drop not null;

create index if not exists idx_routines_template_id on public.routines(template_id);
create index if not exists idx_routines_is_template on public.routines(is_template) where is_template;

-- A template has no client; an assigned routine must have one.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'routines_template_shape') then
    alter table public.routines add constraint routines_template_shape check (
      (is_template and user_id is null) or (not is_template and user_id is not null)
    );
  end if;
end $$;

-- Deliberately NO "one active routine per user" index: unlike programs, a
-- client legitimately has many routines (one per training day).

-- 2) save_coach_routine: p_client_id NULL now means "save a template" ---------
--    Same signature, so this is a plain replace. The Hokage panel calls this
--    same function; the non-null p_client_id path is unchanged (is_template
--    lands false, which is the column default).
create or replace function public.save_coach_routine(
  p_routine_id   uuid,
  p_client_id    uuid,   -- NULL => template
  p_name         text,
  p_description  text,
  p_day_of_week  text,
  p_exercises    jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_routine_id  uuid;
  v_is_template boolean := p_client_id is null;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign routines' using errcode = '42501';
  end if;

  if p_routine_id is null then
    insert into public.routines
      (user_id, assigned_by, source, name, description, day_of_week, is_template)
    values
      (p_client_id, auth.uid(), 'coach', p_name, p_description, p_day_of_week, v_is_template)
    returning id into v_routine_id;
  else
    update public.routines
       set name        = p_name,
           description = p_description,
           day_of_week = p_day_of_week,
           updated_at  = now()
     where id = p_routine_id
    returning id into v_routine_id;

    if v_routine_id is null then
      raise exception 'Routine % not found', p_routine_id using errcode = 'no_data_found';
    end if;

    -- Replace the exercise list wholesale (routine_exercises has no identity
    -- worth preserving; the app orders by sort_order).
    delete from public.routine_exercises where routine_id = v_routine_id;
  end if;

  -- p_client_id NULL flows straight through to user_id here, giving template
  -- children null owners for free.
  insert into public.routine_exercises
    (routine_id, user_id, exercise_id, sets, reps, weight_kg, rest_seconds, sort_order, notes)
  select
    v_routine_id,
    p_client_id,
    (e->>'exercise_id')::uuid,
    (e->>'sets')::int,
    (e->>'reps')::int,
    nullif(e->>'weight_kg', '')::numeric,
    (e->>'rest_seconds')::int,
    (e->>'sort_order')::int,
    nullif(e->>'notes', '')
  from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb)) as e;

  return v_routine_id;
end;
$$;

revoke all     on function public.save_coach_routine(uuid, uuid, text, text, text, jsonb) from public;
grant  execute on function public.save_coach_routine(uuid, uuid, text, text, text, jsonb) to authenticated;

-- 3) Assign a template to a client (snapshot deep copy) ----------------------
--    p_day_of_week overrides the template's day, which matters more here than
--    it does for programs: one "Push Day" template gets pinned to a different
--    weekday per client. Lowercase English ('monday'..'sunday') -- that is what
--    src/utils/assigned-routine.ts and src/utils/day-label.ts expect.
create or replace function public.assign_routine_template(
  p_template_id  uuid,
  p_client_id    uuid,
  p_day_of_week  text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may assign routines' using errcode = '42501';
  end if;

  if not exists (select 1 from public.routines where id = p_template_id and is_template) then
    raise exception 'Routine template % not found', p_template_id using errcode = 'no_data_found';
  end if;

  insert into public.routines
    (user_id, assigned_by, source, name, description, day_of_week, is_template, template_id)
  select p_client_id, auth.uid(), 'coach', t.name, t.description,
         coalesce(nullif(btrim(p_day_of_week), ''), t.day_of_week),
         false, t.id
    from public.routines t
   where t.id = p_template_id
  returning id into v_new_id;

  -- Flat graph: one set-based copy, no day loop.
  insert into public.routine_exercises
    (routine_id, user_id, exercise_id, sets, reps, weight_kg, rest_seconds, sort_order, notes)
  select v_new_id, p_client_id, e.exercise_id, e.sets, e.reps, e.weight_kg,
         e.rest_seconds, e.sort_order, e.notes
    from public.routine_exercises e
   where e.routine_id = p_template_id;

  return v_new_id;
end;
$$;

revoke all     on function public.assign_routine_template(uuid, uuid, text) from public;
grant  execute on function public.assign_routine_template(uuid, uuid, text) to authenticated;

-- 4) Promote a client's one-off routine into a reusable template --------------
--    The mirror of assign_routine_template. The source routine is left running
--    and untouched.
create or replace function public.save_routine_as_template(
  p_routine_id uuid,
  p_name       text default null
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id uuid;
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage routines' using errcode = '42501';
  end if;

  if not exists (select 1 from public.routines where id = p_routine_id and not is_template) then
    raise exception 'Routine % not found', p_routine_id using errcode = 'no_data_found';
  end if;

  insert into public.routines
    (user_id, assigned_by, source, name, description, day_of_week, is_template, template_id)
  select null, auth.uid(), 'coach',
         coalesce(nullif(btrim(p_name), ''), r.name),
         r.description, r.day_of_week,
         true, null
    from public.routines r
   where r.id = p_routine_id
  returning id into v_new_id;

  insert into public.routine_exercises
    (routine_id, user_id, exercise_id, sets, reps, weight_kg, rest_seconds, sort_order, notes)
  select v_new_id, null, e.exercise_id, e.sets, e.reps, e.weight_kg,
         e.rest_seconds, e.sort_order, e.notes
    from public.routine_exercises e
   where e.routine_id = p_routine_id;

  -- Claim the source routine for the new template. Without this the client who
  -- inspired the template would not appear under "assigned clients" -- they ARE
  -- running it, so the library should say so. Only ever fills a null.
  update public.routines
     set template_id = v_new_id, updated_at = now()
   where id = p_routine_id
     and template_id is null
     and not is_template;

  return v_new_id;
end;
$$;

revoke all     on function public.save_routine_as_template(uuid, text) from public;
grant  execute on function public.save_routine_as_template(uuid, text) to authenticated;

commit;

-- Verify:
--   select count(*) from public.routines where is_template;               -- library size
--   select name, user_id, is_template, template_id from public.routines
--     order by created_at desc limit 5;
--   select proname from pg_proc where proname in
--     ('save_coach_routine','assign_routine_template','save_routine_as_template');

-- ==========================================================================
-- [33] 20260925120000_plan_edits_keep_history.sql   (from hokage-coaching-app)
-- ==========================================================================
-- ==========================================================================
-- Editing an assigned program or nutrition plan must never destroy the
-- client's history.
--
-- THE BUG: save_coach_program and save_nutrition_plan updated a plan by
-- deleting every child row and inserting fresh copies. For programs that
-- cascaded program_days -> program_exercises -> workout_set_logs +
-- program_exercise_completions, so a coach who opened a running block in the
-- panel and pressed "Guardar" -- even to fix a typo -- permanently erased every
-- set and check-off the client had logged against it. For nutrition the diary
-- rows survived (meal_items.plan_option_id is ON DELETE SET NULL) but every
-- save unlinked them, silently resetting plan adherence.
--
-- THE FIX, in two layers:
--   1) Both RPCs now save BY ID. Rows the panel sends back with their id are
--      updated in place, rows without one are inserted, and only rows the
--      coach actually removed are deleted. Ids stay stable across edits, so
--      logs, completions and diary links stay attached -- and the app's cached
--      program (and its offline outbox) keeps pointing at live rows.
--   2) A removed prescription no longer takes history with it. The two log
--      tables now DETACH (ON DELETE SET NULL) instead of cascading, and every
--      log carries a snapshot of the exercise name (+ laterality for sets),
--      stamped on insert, so a detached log still reads correctly.
--
-- Swapping one catalog lift for a DIFFERENT catalog lift on an existing row is
-- treated as remove + add, not an in-place edit: the sets already logged were
-- a different lift and must not be relabelled as the new one. Anything else
-- keeps the row -- editing a custom_name, fixing it to the catalog spelling,
-- or promoting a custom movement into the catalog.
--
-- The snapshot is server-owned: API clients can neither write it by hand nor
-- detach a log themselves, and a new log must point at a prescription in the
-- writer's own program (see section 1).
--
-- CONTRACT: same signatures as before. `id` on a program day/exercise or a
-- nutrition meal/option is OPTIONAL. A row without one, or with an id that
-- does not belong to the plan being saved, is inserted as new. An older panel
-- build that sends no ids therefore still works; it just can't keep row
-- identity (and layer 2 still keeps the client's history).
--
-- Additive, idempotent, drift-safe. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

-- 1) Logs keep their own label ------------------------------------------------
alter table public.workout_set_logs
  add column if not exists exercise_name text,
  add column if not exists is_unilateral boolean;
alter table public.program_exercise_completions
  add column if not exists exercise_name text;

comment on column public.workout_set_logs.exercise_name is
  'Exercise name when the set was logged (stamped by trigger). Keeps the log readable after its prescription row is removed.';
comment on column public.workout_set_logs.is_unilateral is
  'Laterality when the set was logged (stamped by trigger) -- volume counts unilateral sets x2.';
comment on column public.program_exercise_completions.exercise_name is
  'Exercise name when the check-off was made (stamped by trigger). Keeps it readable after its prescription row is removed.';

-- Backfill what already exists -- only from a prescription in the log owner's
-- OWN program, so the backfill (which runs as the table owner, outside RLS)
-- can never copy another client's prescription name into someone's log.
update public.workout_set_logs l
   set exercise_name = coalesce(e.name, pe.custom_name),
       is_unilateral = pe.is_unilateral
  from public.program_exercises pe
  join public.program_days d on d.id = pe.program_day_id
  join public.programs p on p.id = d.program_id
  left join public.exercises e on e.id = pe.exercise_id
 where pe.id = l.program_exercise_id
   and p.user_id = l.user_id
   and l.exercise_name is null;

update public.program_exercise_completions c
   set exercise_name = coalesce(e.name, pe.custom_name)
  from public.program_exercises pe
  join public.program_days d on d.id = pe.program_day_id
  join public.programs p on p.id = d.program_id
  left join public.exercises e on e.id = pe.exercise_id
 where pe.id = c.program_exercise_id
   and p.user_id = c.user_id
   and c.exercise_name is null;

-- The snapshot is server-owned. Stamped on insert (and if a log is ever
-- re-pointed); SECURITY INVOKER on purpose, so the lookup runs under the
-- writer's RLS. For an API write (auth.uid() set, issued directly -- depth 1,
-- as opposed to the FK's own ON DELETE SET NULL, which runs one trigger level
-- down, or the SQL editor / service role, which have no auth.uid()):
--   * the log must point at a prescription the writer can read -- the column
--     is nullable only so the FK can DETACH a log, never so a client can
--     create or re-point free-floating "history" (this also closes the old
--     gap where a client could log against another client's prescription);
--   * the snapshot columns can't be rewritten by hand.
create or replace function public.stamp_set_log_snapshot()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_api_write boolean := auth.uid() is not null and pg_trigger_depth() = 1;
begin
  if v_api_write and new.program_exercise_id is null
     and (tg_op = 'INSERT' or old.program_exercise_id is not null) then
    raise exception 'program_exercise_id is required' using errcode = '23502';
  end if;

  if new.program_exercise_id is not null
     and (tg_op = 'INSERT' or new.program_exercise_id is distinct from old.program_exercise_id) then
    select coalesce(e.name, pe.custom_name), pe.is_unilateral
      into new.exercise_name, new.is_unilateral
      from public.program_exercises pe
      left join public.exercises e on e.id = pe.exercise_id
     where pe.id = new.program_exercise_id;
    if not found and v_api_write then
      raise exception 'program exercise % is not in your program', new.program_exercise_id
        using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' and v_api_write then
    new.exercise_name := old.exercise_name;
    new.is_unilateral := old.is_unilateral;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_completion_snapshot()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_api_write boolean := auth.uid() is not null and pg_trigger_depth() = 1;
begin
  if v_api_write and new.program_exercise_id is null
     and (tg_op = 'INSERT' or old.program_exercise_id is not null) then
    raise exception 'program_exercise_id is required' using errcode = '23502';
  end if;

  if new.program_exercise_id is not null
     and (tg_op = 'INSERT' or new.program_exercise_id is distinct from old.program_exercise_id) then
    select coalesce(e.name, pe.custom_name)
      into new.exercise_name
      from public.program_exercises pe
      left join public.exercises e on e.id = pe.exercise_id
     where pe.id = new.program_exercise_id;
    if not found and v_api_write then
      raise exception 'program exercise % is not in your program', new.program_exercise_id
        using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' and v_api_write then
    new.exercise_name := old.exercise_name;
  end if;
  return new;
end;
$$;

-- Every UPDATE, not just UPDATE OF program_exercise_id: the snapshot columns
-- need the same protection when they are the only thing being written.
drop trigger if exists trg_stamp_set_log_snapshot on public.workout_set_logs;
create trigger trg_stamp_set_log_snapshot
  before insert or update on public.workout_set_logs
  for each row execute function public.stamp_set_log_snapshot();

drop trigger if exists trg_stamp_completion_snapshot on public.program_exercise_completions;
create trigger trg_stamp_completion_snapshot
  before insert or update on public.program_exercise_completions
  for each row execute function public.stamp_completion_snapshot();

-- Detach instead of cascade. Referential actions bypass RLS, so the coach's
-- RPC can null these out without holding any write policy on client logs --
-- exactly as the old cascade could delete them.
alter table public.workout_set_logs
  alter column program_exercise_id drop not null;
alter table public.workout_set_logs
  drop constraint if exists workout_set_logs_program_exercise_id_fkey;
alter table public.workout_set_logs
  add constraint workout_set_logs_program_exercise_id_fkey
  foreign key (program_exercise_id) references public.program_exercises(id) on delete set null;

alter table public.program_exercise_completions
  alter column program_exercise_id drop not null;
alter table public.program_exercise_completions
  drop constraint if exists program_exercise_completions_program_exercise_id_fkey;
alter table public.program_exercise_completions
  add constraint program_exercise_completions_program_exercise_id_fkey
  foreign key (program_exercise_id) references public.program_exercises(id) on delete set null;
-- unique (user_id, program_exercise_id, week_number) stays: detached rows carry
-- a null id, and nulls are distinct, so they never collide with live ones.

-- 2) save_coach_program: save by id -------------------------------------------
create or replace function public.save_coach_program(
  p_program_id uuid,
  p_client_id  uuid,   -- NULL => template
  p_header     jsonb,
  p_days       jsonb,
  p_weeks      jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_program_id      uuid;
  v_is_template     boolean := p_client_id is null;
  v_day             jsonb;
  v_day_id          uuid;
  v_ex              jsonb;
  v_ex_id           uuid;
  v_exercise_id     uuid;
  v_old_exercise_id uuid;
  v_keep_days       uuid[] := '{}';
  v_keep_ex         uuid[] := '{}';
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage programs' using errcode = '42501';
  end if;

  if p_program_id is null then
    insert into public.programs
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, progression_rule, tempo_default, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       coalesce((p_header->>'duration_weeks')::int, 1),
       coalesce((p_header->>'start_date')::date, current_date),
       -- For a TEMPLATE, status means library shelf-state: 'active' = available
       -- to assign, 'archived' = retired. It can never collide with the
       -- one-active-per-CLIENT rule, since that index and trigger both ignore
       -- rows with a null user_id.
       coalesce(nullif(p_header->>'status', ''), 'active'),
       nullif(p_header->>'progression_rule', ''),
       nullif(p_header->>'tempo_default', ''),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_program_id;
  else
    update public.programs set
       name             = p_header->>'name',
       description      = nullif(p_header->>'description', ''),
       focus            = nullif(p_header->>'focus', ''),
       duration_weeks   = coalesce((p_header->>'duration_weeks')::int, 1),
       start_date       = coalesce((p_header->>'start_date')::date, start_date),
       status           = case when is_template then status
                               else coalesce(nullif(p_header->>'status', ''), 'active') end,
       progression_rule = nullif(p_header->>'progression_rule', ''),
       tempo_default    = nullif(p_header->>'tempo_default', ''),
       notes            = nullif(p_header->>'notes', ''),
       updated_at       = now()
     where id = p_program_id
    returning id into v_program_id;

    if v_program_id is null then
      raise exception 'Program % not found', p_program_id using errcode = 'no_data_found';
    end if;

    -- Park the existing days on negative day_index values so the in-place
    -- updates below can reorder days: unique (program_id, day_index) is not
    -- deferrable, so it is checked row by row and a swap would collide.
    update public.program_days d
       set day_index = -r.rn
      from (select id, row_number() over (order by day_index, id) as rn
              from public.program_days
             where program_id = v_program_id) r
     where d.id = r.id;
  end if;

  for v_day in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    -- Reuse the day only if it belongs to THIS program and no earlier element
    -- of the payload already claimed it (a duplicated id becomes a new day).
    v_day_id := nullif(v_day->>'id', '')::uuid;
    if v_day_id is not null and not (v_day_id = any(v_keep_days)) then
      update public.program_days set
          day_index  = (v_day->>'day_index')::int,
          label      = nullif(v_day->>'label', ''),
          weekday    = nullif(v_day->>'weekday', ''),
          sort_order = coalesce((v_day->>'sort_order')::int, 0)
       where id = v_day_id
         and program_id = v_program_id
      returning id into v_day_id;
    else
      v_day_id := null;
    end if;

    if v_day_id is null then
      insert into public.program_days (program_id, day_index, label, weekday, sort_order)
      values (v_program_id,
          (v_day->>'day_index')::int,
          nullif(v_day->>'label', ''),
          nullif(v_day->>'weekday', ''),
          coalesce((v_day->>'sort_order')::int, 0))
      returning id into v_day_id;
    end if;
    v_keep_days := v_keep_days || v_day_id;

    for v_ex in select * from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
    loop
      v_ex_id       := nullif(v_ex->>'id', '')::uuid;
      v_exercise_id := nullif(v_ex->>'exercise_id', '')::uuid;

      if v_ex_id is not null and not (v_ex_id = any(v_keep_ex)) then
        -- It must belong to this program (any of its days -- moving a row to
        -- another day keeps its history) and still be the same movement.
        select pe.exercise_id into v_old_exercise_id
          from public.program_exercises pe
          join public.program_days d on d.id = pe.program_day_id
         where pe.id = v_ex_id
           and d.program_id = v_program_id;
        -- Only catalog lift A -> catalog lift B is a swap. custom <-> catalog
        -- is the same movement being named better (a typo fixed to the
        -- catalog spelling, a custom movement promoted into the catalog).
        if not found
           or (v_old_exercise_id is not null and v_exercise_id is not null
               and v_old_exercise_id <> v_exercise_id) then
          -- Swapped lift (or a foreign id): insert fresh; the old row, if it
          -- is ours, falls out with the removals below and its logs detach.
          v_ex_id := null;
        end if;
      else
        v_ex_id := null;
      end if;

      if v_ex_id is not null then
        update public.program_exercises set
            program_day_id   = v_day_id,
            exercise_id      = v_exercise_id,
            custom_name      = nullif(v_ex->>'custom_name', ''),
            sets             = coalesce((v_ex->>'sets')::int, 3),
            rep_min          = nullif(v_ex->>'rep_min', '')::int,
            rep_max          = nullif(v_ex->>'rep_max', '')::int,
            is_unilateral    = coalesce((v_ex->>'is_unilateral')::boolean, false),
            rir_min          = nullif(v_ex->>'rir_min', '')::int,
            rir_max          = nullif(v_ex->>'rir_max', '')::int,
            load_pct_1rm     = nullif(v_ex->>'load_pct_1rm', '')::int,
            load_qualitative = nullif(v_ex->>'load_qualitative', ''),
            tempo            = nullif(v_ex->>'tempo', ''),
            rest_seconds     = nullif(v_ex->>'rest_seconds', '')::int,
            notes            = nullif(v_ex->>'notes', ''),
            sort_order       = coalesce((v_ex->>'sort_order')::int, 0)
         where id = v_ex_id;
      else
        insert into public.program_exercises
          (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral,
           rir_min, rir_max, load_pct_1rm, load_qualitative, tempo, rest_seconds, notes, sort_order)
        values (v_day_id,
            v_exercise_id,
            nullif(v_ex->>'custom_name', ''),
            coalesce((v_ex->>'sets')::int, 3),
            nullif(v_ex->>'rep_min', '')::int,
            nullif(v_ex->>'rep_max', '')::int,
            coalesce((v_ex->>'is_unilateral')::boolean, false),
            nullif(v_ex->>'rir_min', '')::int,
            nullif(v_ex->>'rir_max', '')::int,
            nullif(v_ex->>'load_pct_1rm', '')::int,
            nullif(v_ex->>'load_qualitative', ''),
            nullif(v_ex->>'tempo', ''),
            nullif(v_ex->>'rest_seconds', '')::int,
            nullif(v_ex->>'notes', ''),
            coalesce((v_ex->>'sort_order')::int, 0))
        returning id into v_ex_id;
      end if;
      v_keep_ex := v_keep_ex || v_ex_id;
    end loop;
  end loop;

  -- Removals: only what the coach actually deleted. Their logs survive,
  -- detached (section 1). No-ops for a brand-new program.
  delete from public.program_exercises pe
   using public.program_days d
   where d.id = pe.program_day_id
     and d.program_id = v_program_id
     and not (pe.id = any(v_keep_ex));

  delete from public.program_days
   where program_id = v_program_id
     and not (id = any(v_keep_days));

  -- Weeks have no dependents (logs store week_number, not a key), so a plain
  -- replace is still safe here.
  delete from public.program_weeks where program_id = v_program_id;

  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max,
     is_deload, sets_override, notes)
  select v_program_id,
      (w->>'week_number')::int,
      nullif(w->>'label', ''),
      nullif(w->>'rir_min', '')::int,
      nullif(w->>'rir_max', '')::int,
      nullif(w->>'load_pct_min', '')::int,
      nullif(w->>'load_pct_max', '')::int,
      coalesce((w->>'is_deload')::boolean, false),
      nullif(w->>'sets_override', '')::int,
      nullif(w->>'notes', '')
  from jsonb_array_elements(coalesce(p_weeks, '[]'::jsonb)) as w;

  return v_program_id;
end;
$$;

revoke all     on function public.save_coach_program(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant  execute on function public.save_coach_program(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

-- 3) save_nutrition_plan: save by id ------------------------------------------
--    Meals and options keep their ids (options are what meal_items link to);
--    targets and option items have no dependents and are still replaced.
create or replace function public.save_nutrition_plan(
  p_plan_id   uuid,
  p_client_id uuid,   -- NULL => template
  p_header    jsonb,
  p_targets   jsonb,
  p_meals     jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_plan_id      uuid;
  v_is_template  boolean := p_client_id is null;
  v_meal         jsonb;
  v_meal_id      uuid;
  v_option       jsonb;
  v_option_id    uuid;
  v_keep_meals   uuid[] := '{}';
  v_keep_options uuid[] := '{}';
begin
  if not public.is_coach() then
    raise exception 'Only a coach may manage nutrition plans' using errcode = '42501';
  end if;

  if p_plan_id is null then
    insert into public.nutrition_plans
      (user_id, assigned_by, source, name, description, focus, duration_weeks,
       start_date, status, day_cycling, notes, is_template)
    values
      (p_client_id, auth.uid(), 'coach',
       p_header->>'name',
       nullif(p_header->>'description', ''),
       nullif(p_header->>'focus', ''),
       nullif(p_header->>'duration_weeks', '')::int,
       coalesce((p_header->>'start_date')::date, current_date),
       coalesce(nullif(p_header->>'status', ''), 'active'),
       coalesce((p_header->>'day_cycling')::boolean, true),
       nullif(p_header->>'notes', ''),
       v_is_template)
    returning id into v_plan_id;
  else
    update public.nutrition_plans set
       name           = p_header->>'name',
       description    = nullif(p_header->>'description', ''),
       focus          = nullif(p_header->>'focus', ''),
       duration_weeks = nullif(p_header->>'duration_weeks', '')::int,
       start_date     = coalesce((p_header->>'start_date')::date, start_date),
       status         = case when is_template then status
                             else coalesce(nullif(p_header->>'status', ''), 'active') end,
       day_cycling    = coalesce((p_header->>'day_cycling')::boolean, day_cycling),
       notes          = nullif(p_header->>'notes', ''),
       updated_at     = now()
     where id = p_plan_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Nutrition plan % not found', p_plan_id using errcode = 'no_data_found';
    end if;

    -- Same parking trick as programs: unique (plan_id, slot_index) is checked
    -- row by row, so reordering slots in place needs the old values out of
    -- the way first.
    update public.nutrition_plan_meals m
       set slot_index = -r.rn
      from (select id, row_number() over (order by slot_index, id) as rn
              from public.nutrition_plan_meals
             where plan_id = v_plan_id) r
     where m.id = r.id;

    delete from public.nutrition_plan_targets where plan_id = v_plan_id;
  end if;

  insert into public.nutrition_plan_targets
    (plan_id, day_type, kcal_min, kcal_max, protein_min_g, protein_max_g,
     carbs_min_g, carbs_max_g, fat_min_g, fat_max_g, notes)
  select v_plan_id,
      coalesce(nullif(t->>'day_type', ''), 'both'),
      nullif(t->>'kcal_min', '')::int,
      nullif(t->>'kcal_max', '')::int,
      nullif(t->>'protein_min_g', '')::numeric,
      nullif(t->>'protein_max_g', '')::numeric,
      nullif(t->>'carbs_min_g', '')::numeric,
      nullif(t->>'carbs_max_g', '')::numeric,
      nullif(t->>'fat_min_g', '')::numeric,
      nullif(t->>'fat_max_g', '')::numeric,
      nullif(t->>'notes', '')
  from jsonb_array_elements(coalesce(p_targets, '[]'::jsonb)) as t;

  for v_meal in select * from jsonb_array_elements(coalesce(p_meals, '[]'::jsonb))
  loop
    v_meal_id := nullif(v_meal->>'id', '')::uuid;
    if v_meal_id is not null and not (v_meal_id = any(v_keep_meals)) then
      update public.nutrition_plan_meals set
          slot_index  = (v_meal->>'slot_index')::int,
          label       = nullif(v_meal->>'label', ''),
          meal_type   = coalesce(nullif(v_meal->>'meal_type', ''), 'snack'),
          time_hint   = nullif(v_meal->>'time_hint', ''),
          applies_to  = coalesce(nullif(v_meal->>'applies_to', ''), 'both'),
          is_optional = coalesce((v_meal->>'is_optional')::boolean, false),
          notes       = nullif(v_meal->>'notes', ''),
          sort_order  = coalesce((v_meal->>'sort_order')::int, 0)
       where id = v_meal_id
         and plan_id = v_plan_id
      returning id into v_meal_id;
    else
      v_meal_id := null;
    end if;

    if v_meal_id is null then
      insert into public.nutrition_plan_meals
        (plan_id, slot_index, label, meal_type, time_hint, applies_to, is_optional,
         notes, sort_order)
      values (v_plan_id,
          (v_meal->>'slot_index')::int,
          nullif(v_meal->>'label', ''),
          coalesce(nullif(v_meal->>'meal_type', ''), 'snack'),
          nullif(v_meal->>'time_hint', ''),
          coalesce(nullif(v_meal->>'applies_to', ''), 'both'),
          coalesce((v_meal->>'is_optional')::boolean, false),
          nullif(v_meal->>'notes', ''),
          coalesce((v_meal->>'sort_order')::int, 0))
      returning id into v_meal_id;
    end if;
    v_keep_meals := v_keep_meals || v_meal_id;

    for v_option in select * from jsonb_array_elements(coalesce(v_meal->'options', '[]'::jsonb))
    loop
      -- An option may move to another slot of the same plan and keep its id
      -- (and with it every diary entry registered from it).
      v_option_id := nullif(v_option->>'id', '')::uuid;
      if v_option_id is not null and not (v_option_id = any(v_keep_options)) then
        update public.nutrition_plan_options o set
            plan_meal_id = v_meal_id,
            label        = nullif(v_option->>'label', ''),
            notes        = nullif(v_option->>'notes', ''),
            sort_order   = coalesce((v_option->>'sort_order')::int, 0)
          from public.nutrition_plan_meals m
         where o.id = v_option_id
           and m.id = o.plan_meal_id
           and m.plan_id = v_plan_id
        returning o.id into v_option_id;
      else
        v_option_id := null;
      end if;

      if v_option_id is null then
        insert into public.nutrition_plan_options (plan_meal_id, label, notes, sort_order)
        values (v_meal_id,
            nullif(v_option->>'label', ''),
            nullif(v_option->>'notes', ''),
            coalesce((v_option->>'sort_order')::int, 0))
        returning id into v_option_id;
      else
        delete from public.nutrition_plan_option_items where option_id = v_option_id;
      end if;
      v_keep_options := v_keep_options || v_option_id;

      insert into public.nutrition_plan_option_items
        (option_id, name, day_type, sort_order)
      select v_option_id,
          i->>'name',
          coalesce(nullif(i->>'day_type', ''), 'both'),
          coalesce((i->>'sort_order')::int, 0)
      from jsonb_array_elements(coalesce(v_option->'items', '[]'::jsonb)) as i
      where coalesce(btrim(i->>'name'), '') <> '';
    end loop;
  end loop;

  -- Removals: only what the coach deleted. A diary entry registered from a
  -- removed option keeps its food and macros; only its plan link clears.
  delete from public.nutrition_plan_options o
   using public.nutrition_plan_meals m
   where m.id = o.plan_meal_id
     and m.plan_id = v_plan_id
     and not (o.id = any(v_keep_options));

  delete from public.nutrition_plan_meals
   where plan_id = v_plan_id
     and not (id = any(v_keep_meals));

  return v_plan_id;
end;
$$;

revoke all     on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) from public;
grant  execute on function public.save_nutrition_plan(uuid, uuid, jsonb, jsonb, jsonb) to authenticated;

commit;

-- Verify:
--   -- expect exercise_name/is_unilateral present and program_exercise_id nullable:
--   select table_name, column_name, is_nullable from information_schema.columns
--    where table_name in ('workout_set_logs', 'program_exercise_completions')
--      and column_name in ('program_exercise_id', 'exercise_name', 'is_unilateral');
--   -- expect confdeltype = 'n' (SET NULL) on both:
--   select conname, confdeltype from pg_constraint
--    where conname in ('workout_set_logs_program_exercise_id_fkey',
--                      'program_exercise_completions_program_exercise_id_fkey');

-- ==========================================================================
-- ZYRON STANDALONE — this project serves Zyron only.
-- ==========================================================================

begin;

-- Every profile here is Zyron's. The column stays (for now) because the
-- current Zyron build writes app = 'zyron' on every sign-in (auth-provider
-- claimAppScope) -- drop it together with that code later.
alter table public.profiles alter column app set default 'zyron';
update public.profiles set app = 'zyron' where app <> 'zyron';   -- no-op on a new project
alter table public.profiles drop constraint if exists profiles_app_check;
alter table public.profiles add constraint profiles_app_check check (app = 'zyron');

-- Zyron users sign themselves up: an account is self-serve until a coach takes
-- it on. (The shared project defaulted to 'coached' because it was built for
-- Hokage, whose accounts are all created by the coach.)
alter table public.profiles alter column account_type set default 'solo';

-- Exercise demo GIFs live in this project's own public bucket (on the shared
-- project it was created by hand, so no migration made it).
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do nothing;

commit;

-- REQUIRED — run AFTER uploading the GIFs to this project's exercise-media
-- bucket (not before: the new URLs would 404). Replace <ZYRON_PROJECT_REF>
-- (Settings -> General -> Project ID). Until this runs, Zyron streams every
-- exercise demo from the OLD project -- which becomes Hokage's.
--
--   update public.exercises
--      set video_url = replace(video_url,
--            'https://rzgwkwxskrovxnnymxqo.supabase.co/',
--            'https://<ZYRON_PROJECT_REF>.supabase.co/'),
--          updated_at = now()
--    where video_url like 'https://rzgwkwxskrovxnnymxqo.supabase.co/%';

-- Verify:
--   select count(*) from public.exercises;                          -- the catalog (224)
--   select column_default from information_schema.columns
--    where table_name = 'profiles' and column_name in ('app', 'account_type');  -- 'zyron', 'solo'
--   select id, public from storage.buckets order by id;             -- exercise-media, meal-photos
--   select count(*) from public.exercises where name like '%Ã%';     -- 0 (no garbled accents)
--   select count(*) from public.exercises
--    where video_url like '%rzgwkwxskrovxnnymxqo%';                   -- 0 once the REQUIRED block ran
