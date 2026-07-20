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
