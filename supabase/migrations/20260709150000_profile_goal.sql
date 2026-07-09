-- Adds the user's training/nutrition objective to profiles. Drives both the
-- AI workout-plan generator (exercise selection, rep ranges, rest periods)
-- and the calorie recommendation (deficit/surplus vs. maintenance).
-- Run in the Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

alter table public.profiles
  add column if not exists goal text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_goal_check') then
    alter table public.profiles
      add constraint profiles_goal_check check (goal in ('lose_weight', 'gain_muscle', 'maintain'));
  end if;
end $$;

comment on column public.profiles.goal is
  'Training/nutrition objective: lose_weight | gain_muscle | maintain. Null = not set.';
