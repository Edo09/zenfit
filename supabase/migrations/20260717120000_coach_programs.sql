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
