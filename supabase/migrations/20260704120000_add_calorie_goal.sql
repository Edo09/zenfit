-- Adds the user-configurable daily calorie goal to profiles.
-- Run in the Supabase SQL editor (or `supabase db push` if the CLI is linked):
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

alter table public.profiles
  add column if not exists calorie_goal integer;

comment on column public.profiles.calorie_goal is
  'Target daily calorie intake (kcal). Null = not set; app falls back to a recommendation derived from age/sex/height/weight/activity.';
