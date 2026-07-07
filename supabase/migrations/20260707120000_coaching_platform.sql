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
