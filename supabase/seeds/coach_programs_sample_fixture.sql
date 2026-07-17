-- ==========================================================================
-- P0 ACCEPTANCE FIXTURE — reproduces both sample coach PDFs in the Coach
-- Programs schema (docs/COACH-PROGRAMS-SPEC.md, Phase 1 exit criterion).
--
-- Proves the schema is lossless before any UI or Admin Panel exists: run it,
-- then read the programs back and compare to samples/*.pdf.
--
-- Requires:
--   * 20260717120000_coach_programs.sql applied (tables)
--   * 20260717120100_coach_programs_catalog_topup.sql applied (missing exercises)
--   * exactly one profile with role='coach'
--   * a client profile — EDIT the email below to the test client.
--
-- Idempotent-ish: it DELETES any prior copy of these two named programs for
-- the client first, so re-running gives a clean reproduction. Run in the
-- Supabase SQL editor (auth.uid() is null there, so start_date defaults are
-- exempt from the past-date guard).
--
-- Exercise names are the coach's shorthand mapped to the catalog's canonical
-- names; anything not found falls back to custom_name (no rows should).
-- ==========================================================================

do $$
declare
  v_client_email text := 'edwintest@yopmail.com';   -- <<< EDIT to your test client
  v_coach   uuid;
  v_client  uuid;
  v_prog    uuid;
  v_day     uuid;
begin
  -- Email lives on auth.users (not public.profiles); profiles.id = users.id.
  -- If you'd rather skip the lookup, hard-code v_client to the profile uuid.
  select id into v_coach  from public.profiles where role = 'coach' limit 1;
  select u.id into v_client
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(v_client_email)
   limit 1;
  if v_coach  is null then raise exception 'no coach profile (role=coach) found'; end if;
  if v_client is null then raise exception 'client % not found in auth.users', v_client_email; end if;

  -- Clean prior copies so re-runs are deterministic (cascade clears children).
  delete from public.programs
   where user_id = v_client
     and name in ('Hipertrofia — Glúteos y Piernas',
                  'Hokage Elite System — Push/Pull/Legs');

  -- ======================================================================
  -- PROGRAM 2 first (the one with the explicit weekly table)
  -- samples/Rutina_Hipertrofia_Gluteos_Piernas_5_Semanas.pdf
  -- ======================================================================
  insert into public.programs
    (user_id, assigned_by, name, description, focus, duration_weeks, start_date, status)
  values
    (v_client, v_coach, 'Hipertrofia — Glúteos y Piernas',
     'Bloque de hipertrofia de 5 semanas con énfasis en glúteos y piernas.',
     'Glúteos y Piernas', 5, current_date, 'active')
  returning id into v_prog;

  -- weekly periodization table
  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max, is_deload, notes)
  values
    (v_prog, 1, 'Técnica y base', 2, 3, 60, 60, false, 'Técnica y control'),
    (v_prog, 2, 'Progresión',     1, 2, 65, 70, false, 'Más volumen y cargas'),
    (v_prog, 3, 'Sobrecarga',     1, 1, 75, 75, false, 'Peso moderado-alto'),
    (v_prog, 4, 'Pico',           0, 1, 80, 85, false, 'Máximo esfuerzo'),
    (v_prog, 5, 'Descarga',       3, 4, 50, 60, true,  'Descarga activa');

  -- ---- Lunes — Glúteos + Femorales ----
  insert into public.program_days (program_id, day_index, label, weekday, sort_order)
  values (v_prog, 1, 'Glúteos + Femorales', 'monday', 0) returning id into v_day;
  insert into public.program_exercises
    (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral, load_pct_1rm, load_qualitative, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end,
         d.sets, d.rmin, d.rmax, d.uni, d.pct, d.qual, d.ord
  from (values
    ('Hip Thrust con Barra',                 4, 12, 12, false, 60,  null,       0),
    ('Peso Muerto Rumano (RDL)',             3, 10, 10, false, null,'moderate', 1),
    ('Curl de Femoral Tumbado (Prone Leg Curl)', 3, 15, 15, false, null,'light', 2),
    ('Máquina de Abductores (Abductor Machine)', 3, 20, 20, false, null, null,   3),
    ('Good Morning con Barra',               2, 15, 15, false, null,'light',    4)
  ) as d(canonical, sets, rmin, rmax, uni, pct, qual, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Martes — Cuádriceps dominante ----
  insert into public.program_days (program_id, day_index, label, weekday, sort_order)
  values (v_prog, 2, 'Cuádriceps dominante', 'tuesday', 1) returning id into v_day;
  insert into public.program_exercises
    (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral, load_pct_1rm, load_qualitative, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end,
         d.sets, d.rmin, d.rmax, d.uni, d.pct, d.qual, d.ord
  from (values
    ('Sentadilla Frontal',                   4,  8,  8, false, 60,  null,       0),
    ('Prensa de Piernas Inclinada (45°)',    4, 12, 12, false, null,'light',    1),
    ('Zancada Caminando (Walking Lunge)',    3, 12, 12, true,  null,'moderate', 2),
    ('Extensión de Cuádriceps en Máquina Sentado', 3, 15, 15, false, null, null, 3),
    ('Elevación de Gemelos Sentado (Seated Calf Raise)', 3, 20, 20, false, null, null, 4)
  ) as d(canonical, sets, rmin, rmax, uni, pct, qual, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Jueves — Glúteos aislados + unilateral ----
  insert into public.program_days (program_id, day_index, label, weekday, sort_order)
  values (v_prog, 3, 'Glúteos aislados + unilateral', 'thursday', 2) returning id into v_day;
  insert into public.program_exercises
    (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, is_unilateral, load_qualitative, tempo, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end,
         d.sets, d.rmin, d.rmax, d.uni, d.qual, d.tempo, d.ord
  from (values
    ('Sentadilla Búlgara (Búlgar Split Squat)', 3, 12, 12, true,  null,   null,          0),
    ('Hip Thrust con Pausa en el Punto Superior', 3, 12, 12, false, 'light','Pausa 2 s arriba', 1),
    ('Step-up con Mancuerna',                3, 10, 10, true,  null,   null,          2),
    ('Patada de Glúteo en Polea (Donkey Kick)', 3, 15, 15, true,  null,   null,          3),
    ('Máquina de Abductores (Abductor Machine)', 3, 20, 20, false, null,   null,          4)
  ) as d(canonical, sets, rmin, rmax, uni, qual, tempo, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Viernes — Tren superior (total) ----
  insert into public.program_days (program_id, day_index, label, weekday, sort_order)
  values (v_prog, 4, 'Tren superior (total)', 'friday', 3) returning id into v_day;
  insert into public.program_exercises
    (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, load_qualitative, notes, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end,
         d.sets, d.rmin, d.rmax, d.qual, d.notes, d.ord
  from (values
    ('Press de Banca Plano',                 4, 10, 10, 'moderate', null,      0),
    ('Jalones al Pecho en Polea (Front)',    4, 12, 12, null,       null,      1),
    ('Remo Inclinado con Barra (Barbell Row)', 3, 10, 10, null,      null,      2),
    ('Press de Hombro con Mancuernas',       3, 10, 10, null,       null,      3),
    ('Curl de Bíceps con Mancuernas',        3, 12, 12, null,       'Superset con extensión de tríceps', 4),
    ('Extensiones de Tríceps en Polea (Pushdown)', 3, 12, 12, null, 'Superset con curl de bíceps', 5),
    ('Face Pull (Deltoides Posterior + Manguito)', 3, 15, 15, null, null,      6)
  ) as d(canonical, sets, rmin, rmax, qual, notes, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Sábado — Tren inferior completo ----
  insert into public.program_days (program_id, day_index, label, weekday, sort_order)
  values (v_prog, 5, 'Tren inferior completo', 'saturday', 4) returning id into v_day;
  insert into public.program_exercises
    (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, load_pct_1rm, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end,
         d.sets, d.rmin, d.rmax, d.pct, d.ord
  from (values
    ('Sentadilla Trasera con Barra Alta',    4, 10, 10, 60,   0),
    ('Hip Thrust con Barra',                 3, 12, 12, null, 1),
    ('Peso Muerto Rumano (RDL)',             3, 10, 10, null, 2),
    ('Curl de Femoral Tumbado (Prone Leg Curl)', 3, 15, 15, null, 3),
    ('Extensión de Cuádriceps en Máquina Sentado', 3, 15, 15, null, 4),
    ('Abducción de Cadera con Banda Elástica', 2, 25, 25, null, 5)
  ) as d(canonical, sets, rmin, rmax, pct, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ======================================================================
  -- PROGRAM 1 — samples/RUTINA DE ENTRENAMIENTO.pdf
  -- 5-day PPL-ish split, every lift 4x6-8, double-progression, periodized
  -- in prose (deload week 5 = 3 sets, -10-15%).
  -- ======================================================================
  insert into public.programs
    (user_id, assigned_by, name, description, focus, duration_weeks, start_date, status,
     progression_rule, tempo_default, notes)
  values
    (v_client, v_coach, 'Hokage Elite System — Push/Pull/Legs',
     'Bloque de fuerza-hipertrofia de 5 semanas, split de 5 días.',
     'Fuerza e hipertrofia', 5, current_date, 'active',
     'Doble progresión: mantener el peso hasta lograr 8 reps en todas las series; al lograrlo, subir carga y reiniciar en 6 reps.',
     'Excéntrica 2-3 s · concéntrica explosiva controlada · pausa mínima',
     'Cardio 20 min postworkout. Prioriza técnica sobre carga; evita el fallo absoluto en fases tempranas.')
  returning id into v_prog;

  insert into public.program_weeks
    (program_id, week_number, label, rir_min, rir_max, load_pct_min, load_pct_max, is_deload, sets_override, notes)
  values
    (v_prog, 1, 'Base técnica',      2, 3, 70, 75, false, null, 'Adaptación + ejecución perfecta'),
    (v_prog, 2, 'Progresión',        2, 2, null, null, false, null, 'Incremento +2.5-5% carga; mantener reps y subir peso'),
    (v_prog, 3, 'Sobrecarga',        1, 2, null, null, false, null, 'Incremento progresivo; estímulo mecánico alto'),
    (v_prog, 4, 'Pico de intensidad',0, 1, null, null, false, null, 'Últimas series cercanas al fallo técnico'),
    (v_prog, 5, 'Deload',            3, 4, null, null, true,  3,    'Carga -10-15%; recuperación y supercompensación');

  -- ---- Día 1 — Pecho + Bíceps ----
  insert into public.program_days (program_id, day_index, label, sort_order)
  values (v_prog, 1, 'Pecho + Bíceps', 0) returning id into v_day;
  insert into public.program_exercises (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end, 4, 6, 8, d.ord
  from (values
    ('Press de Banca Plano', 0),
    ('Press de Banca Inclinado (45°)', 1),
    ('Press de Banca con Mancuerna en Rotación Neutra', 2),
    ('Aperturas en Banco Inclinado', 3),
    ('Cruces en Polea Alta', 4),
    ('Curl de Bíceps con Barra Z', 5),
    ('Curl de Bíceps en Inclinado', 6),
    ('Curl de Bíceps en Polea (Cable Curl)', 7)
  ) as d(canonical, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Día 2 — Espalda + Tríceps ----
  insert into public.program_days (program_id, day_index, label, sort_order)
  values (v_prog, 2, 'Espalda + Tríceps', 1) returning id into v_day;
  insert into public.program_exercises (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end, 4, 6, 8, d.ord
  from (values
    ('Dominadas con Agarre Abierto', 0),
    ('Remo Inclinado con Barra en T (T-Bar Row)', 1),
    ('Remo con Mancuerna a 1 Mano (One-Arm Row)', 2),
    ('Remo en Polea Baja con Agarre Abierto', 3),
    ('Pullover en Polea', 4),
    ('Press de Banca con Agarre Cerrado', 5),
    ('Extensiones de Tríceps en Polea (Pushdown)', 6),
    ('Extensiones de Tríceps por Encima de la Cabeza', 7)
  ) as d(canonical, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Día 3 — Piernas (Cuádriceps + Gemelos) ----
  insert into public.program_days (program_id, day_index, label, sort_order)
  values (v_prog, 3, 'Piernas (Cuádriceps + Gemelos)', 2) returning id into v_day;
  insert into public.program_exercises (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end, 4, 6, 8, d.ord
  from (values
    ('Prensa de Piernas Inclinada (45°)', 0),
    ('Sentadilla en Máquina Hack', 1),
    ('Extensión de Cuádriceps en Máquina Sentado', 2),
    ('Elevación de Gemelos de Pie (Standing Calf Raise)', 3),
    ('Elevación de Gemelos Sentado (Seated Calf Raise)', 4)
  ) as d(canonical, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Día 4 — Hombros ----
  insert into public.program_days (program_id, day_index, label, sort_order)
  values (v_prog, 4, 'Hombros', 3) returning id into v_day;
  insert into public.program_exercises (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end, 4, 6, 8, d.ord
  from (values
    ('Press Militar (por encima de la cabeza)', 0),
    ('Elevaciones Laterales (Deltoides Medio)', 1),
    ('Vuelos Posteriores (Deltoides Posterior)', 2)
  ) as d(canonical, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  -- ---- Día 5 — Femoral + Glúteo + Gemelos ----
  insert into public.program_days (program_id, day_index, label, sort_order)
  values (v_prog, 5, 'Femoral + Glúteo + Gemelos', 4) returning id into v_day;
  insert into public.program_exercises (program_day_id, exercise_id, custom_name, sets, rep_min, rep_max, sort_order)
  select v_day, e.id, case when e.id is null then d.canonical end, 4, 6, 8, d.ord
  from (values
    ('Peso Muerto Rumano (RDL)', 0),
    ('Curl de Femoral Tumbado (Prone Leg Curl)', 1),
    ('Curl de Femoral Sentado (Seated Leg Curl)', 2),
    ('Elevación de Gemelos de Pie (Standing Calf Raise)', 3),
    ('Elevación de Gemelos en Prensa de Piernas', 4)
  ) as d(canonical, ord)
  left join public.exercises e on lower(e.name) = lower(d.canonical);

  raise notice 'Seeded 2 sample programs for % (coach %)', v_client_email, v_coach;
end $$;

-- Sanity: any prescription that fell back to custom_name (catalog miss)?
-- Expected: 0 rows. If not, add the name to the catalog top-up migration.
select pe.custom_name, pd.label as day, p.name as program
from public.program_exercises pe
join public.program_days pd on pd.id = pe.program_day_id
join public.programs p on p.id = pd.program_id
where pe.exercise_id is null
order by p.name, pd.sort_order;
