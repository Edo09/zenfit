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
