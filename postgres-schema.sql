-- ============================================================================
-- Habbito / Hokage Coaching — standalone PostgreSQL schema (NO Supabase)
-- ============================================================================
--
-- This is the full current data model, ported off Supabase's managed
-- services (Auth/GoTrue, PostgREST role model, Storage) onto plain
-- PostgreSQL. It is NOT a drop-in replacement for `supabase-schema.sql` +
-- the `supabase/migrations/*.sql` files — those assume you're running on
-- Supabase (cloud or self-hosted). Run only ONE of the two schemes, never
-- both against the same database.
--
-- IMPORTANT — what this file does and does NOT solve for you:
--
--   It DOES give you: every table, constraint, index, and Row-Level-Security
--   policy the app relies on, plus minimal stand-ins for the two Supabase
--   pieces the schema itself leans on (`auth.users`, `auth.uid()`).
--
--   It does NOT give you: a working login system, session/JWT issuance, or
--   an HTTP API. The mobile app talks to Postgres today via `@supabase/
--   supabase-js`, which expects Supabase's PostgREST-compatible REST API and
--   GoTrue auth service in front of the database. Pointing that same app at
--   a bare `postgres://` connection string will not work. To actually go
--   Supabase-free you additionally need EITHER:
--     (a) your own backend/API server that authenticates users, issues its
--         own session, and executes queries against this schema on the
--         user's behalf (rewriting every `supabase.from(...)` /
--         `supabase.auth.*` / `supabase.storage.*` call in `src/` to hit
--         that API instead), or
--     (b) PostgREST + an auth/JWT issuer of your own choosing pointed at
--         this schema — which is, in effect, reassembling what Supabase's
--         own self-host Docker Compose already gives you for free. If your
--         actual goal is "not pay for Supabase cloud" rather than "no
--         Supabase software at all," self-hosting Supabase's OSS stack and
--         reusing the existing `supabase-schema.sql` + migrations is far
--         less work than this path.
--
-- THE INTEGRATION CONTRACT (read this before writing your backend):
--
--   Every table's Row-Level-Security policy below is keyed off `auth.uid()`,
--   same as in the Supabase version. Here `auth.uid()` is a stub that reads
--   a Postgres session variable instead of parsing a Supabase JWT. Your
--   backend MUST, for every authenticated request, run (inside the same
--   transaction/session that executes the user's query):
--
--     SET LOCAL app.current_user_id = '<the authenticated user's uuid>';
--
--   For trusted/admin operations that should bypass the "clients can't
--   change their own role" guard (see guard_role_change() below), also run:
--
--     SET LOCAL app.current_role = 'service_role';
--
--   And your DB connection for ordinary user requests should authenticate
--   as (or SET ROLE into) the `authenticated` Postgres role created below,
--   so the GRANTs take effect; use `service_role` only for trusted
--   backend-internal operations, never exposed to a client directly.
--
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0) Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1) Auth shim — replaces Supabase's managed `auth` schema
-- ----------------------------------------------------------------------------
-- Minimal stand-in so the rest of this schema's foreign keys and RLS
-- policies (which assume a Supabase-shaped `auth.users` + `auth.uid()`)
-- keep working unmodified. This table does NOT implement password hashing,
-- sessions, or token issuance — that's your backend's job. Insert a row here
-- yourself when you create a user account in your own auth system.
create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Backed by a session variable your backend sets per request (see the
-- integration contract above), not a parsed JWT.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create or replace function auth.role()
returns text language sql stable as $$
  select coalesce(nullif(current_setting('app.current_role', true), ''), 'authenticated');
$$;

-- ----------------------------------------------------------------------------
-- 2) Roles — mirrors Supabase's anon/authenticated/service_role convention
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) Tables (dependency order)
-- ----------------------------------------------------------------------------

-- 3a. Body parts (reference table — exercises tag one of these)
create table public.bodyparts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

-- 3b. Profiles (1:1 with auth.users)
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
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  calorie_goal integer, -- null = not set; app derives a recommendation
  role text not null default 'user' check (role in ('user', 'coach')),
  whatsapp text -- coach's contact number, international digits, shown to clients
);

-- Single-coach model: is_coach() gates every coach-wide RLS policy below.
create or replace function public.is_coach()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach');
$$;

-- 3c. Exercise catalog — shared library, coach-managed. Assigning the same
--     exercise to many clients means referencing this row, not retyping a
--     name each time; editing it here updates every client instantly.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  video_url text,
  body_part_id uuid references public.bodyparts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index exercises_name_lower_idx on public.exercises (lower(name));

-- 3d. Routines
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  day_of_week text, -- 'monday'..'sunday', or null for any day
  -- null = self-made; a coach's profiles.id = coach-assigned (read-only for the client)
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_routines_user_id on public.routines(user_id);
create index idx_routines_assigned_by on public.routines(assigned_by);

-- 3e. Routine exercises — one assignment of a catalog exercise into a
--     routine, with per-routine sets/reps/weight/rest.
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references public.routines(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sets integer default 3,
  reps integer default 10,
  weight_kg numeric,
  rest_seconds integer default 60,
  sort_order integer default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_routine_exercises_routine_id on public.routine_exercises(routine_id);

-- 3f. Meals
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  date date not null default current_date,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_meals_user_id_date on public.meals(user_id, date);
create index idx_meals_assigned_by on public.meals(assigned_by);

-- 3g. Meal items. `photo_path` is just a text field — the object itself
--     lives wherever you decide to store files (S3-compatible bucket, disk
--     + web server, etc.). This schema doesn't model file storage.
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
  photo_path text,
  created_at timestamptz not null default now()
);
create index idx_meal_items_meal_id on public.meal_items(meal_id);

-- 3h. Workout logs (routine_name is a denormalized snapshot so it survives
--     the routine being deleted later)
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  routine_id uuid references public.routines(id) on delete set null,
  routine_name text not null,
  date date not null default current_date,
  duration_minutes integer,
  notes text,
  completed_exercises text[], -- names snapshotted at log time, not exercise_ids
  created_at timestamptz not null default now()
);
create index idx_workout_logs_user_id_date on public.workout_logs(user_id, date);

-- 3i. Memberships (coach-managed status; no in-app payment processing)
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  plan_name text,
  status text not null default 'active' check (status in ('active', 'expired', 'paused', 'cancelled')),
  price numeric,
  currency text default 'USD',
  started_at date not null default current_date,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_memberships_client on public.memberships(client_id);

-- ----------------------------------------------------------------------------
-- 4) Functions & triggers
-- ----------------------------------------------------------------------------

create or replace function public.is_assigned_routine(rid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.routines r where r.id = rid and r.assigned_by is not null);
$$;

create or replace function public.is_assigned_meal(mid uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.meals m where m.id = mid and m.assigned_by is not null);
$$;

-- Blocks role changes made by an authenticated end-user (auth.uid() set,
-- not acting as service_role). Direct DB access with no session variable
-- set (auth.uid() null) and your backend's trusted/service path are allowed.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role changes are not permitted from the client';
  end if;
  return new;
end;
$$;
create trigger trg_guard_role_change before update on public.profiles
  for each row execute function public.guard_role_change();

-- Auto-creates a profile row whenever your backend inserts into auth.users.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5) Row Level Security
-- ----------------------------------------------------------------------------

-- profiles ---------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "coach profile readable by clients" on public.profiles for select using (role = 'coach');
create policy "coach reads all profiles" on public.profiles for select using (public.is_coach());
create policy "coach updates all profiles" on public.profiles for update
  using (public.is_coach()) with check (public.is_coach());

-- exercises (shared catalog: everyone reads, only the coach writes) ------
alter table public.exercises enable row level security;
create policy "exercises are viewable by authenticated users" on public.exercises
  for select to authenticated using (true);
create policy "coach manages exercises" on public.exercises
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- routines -----------------------------------------------------------------
alter table public.routines enable row level security;
create policy "users view own routines" on public.routines for select using (auth.uid() = user_id);
create policy "users create own routines" on public.routines for insert with check (auth.uid() = user_id);
create policy "users update own routines" on public.routines for update using (auth.uid() = user_id);
create policy "users delete own routines" on public.routines for delete using (auth.uid() = user_id);
create policy "coach all routines" on public.routines
  for all using (public.is_coach()) with check (public.is_coach());
-- Coach-assigned routines are read-only for the client (restrictive = ANDed on top of the above)
create policy "routines assigned read-only (upd)" on public.routines as restrictive for update
  using (public.is_coach() or assigned_by is null) with check (public.is_coach() or assigned_by is null);
create policy "routines assigned read-only (del)" on public.routines as restrictive for delete
  using (public.is_coach() or assigned_by is null);
create policy "routines no self-fake assign (ins)" on public.routines as restrictive for insert
  with check (public.is_coach() or assigned_by is null);

-- routine_exercises ----------------------------------------------------------
alter table public.routine_exercises enable row level security;
create policy "users view own exercises" on public.routine_exercises for select using (auth.uid() = user_id);
create policy "users create own exercises" on public.routine_exercises for insert with check (auth.uid() = user_id);
create policy "users update own exercises" on public.routine_exercises for update using (auth.uid() = user_id);
create policy "users delete own exercises" on public.routine_exercises for delete using (auth.uid() = user_id);
create policy "coach all routine_exercises" on public.routine_exercises
  for all using (public.is_coach()) with check (public.is_coach());
create policy "exercises of assigned read-only (upd)" on public.routine_exercises as restrictive for update
  using (public.is_coach() or not public.is_assigned_routine(routine_id));
create policy "exercises of assigned read-only (del)" on public.routine_exercises as restrictive for delete
  using (public.is_coach() or not public.is_assigned_routine(routine_id));

-- meals ----------------------------------------------------------------------
alter table public.meals enable row level security;
create policy "users view own meals" on public.meals for select using (auth.uid() = user_id);
create policy "users create own meals" on public.meals for insert with check (auth.uid() = user_id);
create policy "users update own meals" on public.meals for update using (auth.uid() = user_id);
create policy "users delete own meals" on public.meals for delete using (auth.uid() = user_id);
create policy "coach all meals" on public.meals
  for all using (public.is_coach()) with check (public.is_coach());
create policy "meals assigned read-only (upd)" on public.meals as restrictive for update
  using (public.is_coach() or assigned_by is null) with check (public.is_coach() or assigned_by is null);
create policy "meals assigned read-only (del)" on public.meals as restrictive for delete
  using (public.is_coach() or assigned_by is null);
create policy "meals no self-fake assign (ins)" on public.meals as restrictive for insert
  with check (public.is_coach() or assigned_by is null);

-- meal_items -------------------------------------------------------------
alter table public.meal_items enable row level security;
create policy "users view own meal items" on public.meal_items for select using (auth.uid() = user_id);
create policy "users create own meal items" on public.meal_items for insert with check (auth.uid() = user_id);
create policy "users update own meal items" on public.meal_items for update using (auth.uid() = user_id);
create policy "users delete own meal items" on public.meal_items for delete using (auth.uid() = user_id);
create policy "coach all meal_items" on public.meal_items
  for all using (public.is_coach()) with check (public.is_coach());
create policy "items of assigned read-only (upd)" on public.meal_items as restrictive for update
  using (public.is_coach() or not public.is_assigned_meal(meal_id));
create policy "items of assigned read-only (del)" on public.meal_items as restrictive for delete
  using (public.is_coach() or not public.is_assigned_meal(meal_id));

-- workout_logs -----------------------------------------------------------
alter table public.workout_logs enable row level security;
create policy "users view own workout logs" on public.workout_logs for select using (auth.uid() = user_id);
create policy "users create own workout logs" on public.workout_logs for insert with check (auth.uid() = user_id);
create policy "users update own workout logs" on public.workout_logs for update using (auth.uid() = user_id);
create policy "users delete own workout logs" on public.workout_logs for delete using (auth.uid() = user_id);
create policy "coach all workout_logs" on public.workout_logs
  for all using (public.is_coach()) with check (public.is_coach());

-- bodyparts (public reference data) ---------------------------------------
alter table public.bodyparts enable row level security;
create policy "body parts are viewable by everyone" on public.bodyparts for select using (true);

-- memberships --------------------------------------------------------------
alter table public.memberships enable row level security;
create policy "client views own membership" on public.memberships for select using (client_id = auth.uid());
create policy "coach manages memberships" on public.memberships
  for all using (public.is_coach()) with check (public.is_coach());

-- ----------------------------------------------------------------------------
-- 6) Grants
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.meals to authenticated;
grant select, insert, update, delete on public.meal_items to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select on public.bodyparts to authenticated, anon;

-- service_role bypasses RLS (see `bypassrls` on the role above) but still
-- needs table privileges to act at all.
grant all on all tables in schema public to service_role;

-- ----------------------------------------------------------------------------
-- 7) Seed data
-- ----------------------------------------------------------------------------
insert into public.bodyparts (name) values
  ('back'), ('cardio'), ('chest'), ('lower arms'), ('lower legs'),
  ('neck'), ('shoulders'), ('upper arms'), ('upper legs'), ('waist');

commit;

-- ----------------------------------------------------------------------------
-- Optional: the 220-exercise catalog seed (supabase/migrations/
-- 20260709130000_exercise_catalog_seed.sql) is plain SQL with no
-- Supabase-specific syntax — it runs unmodified against this schema too,
-- as long as this file has already been applied first.
-- ----------------------------------------------------------------------------
