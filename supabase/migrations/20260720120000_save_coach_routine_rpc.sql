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
