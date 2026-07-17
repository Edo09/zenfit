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
