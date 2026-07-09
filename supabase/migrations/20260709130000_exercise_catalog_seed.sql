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
