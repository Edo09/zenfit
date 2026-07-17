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
