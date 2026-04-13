-- ============================================================
-- ZenFit Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- 1. PROFILES
-- Auto-created for each user via trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. ROUTINES
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  description text,
  day_of_week text, -- 'monday', 'tuesday', etc. or null for any day
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.routines enable row level security;

create policy "Users can view own routines"
  on public.routines for select
  using (auth.uid() = user_id);

create policy "Users can create own routines"
  on public.routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own routines"
  on public.routines for update
  using (auth.uid() = user_id);

create policy "Users can delete own routines"
  on public.routines for delete
  using (auth.uid() = user_id);


-- 3. ROUTINE EXERCISES
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references public.routines(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  sets integer default 3,
  reps integer default 10,
  weight_kg numeric,
  rest_seconds integer default 60,
  sort_order integer default 0,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.routine_exercises enable row level security;

create policy "Users can view own exercises"
  on public.routine_exercises for select
  using (auth.uid() = user_id);

create policy "Users can create own exercises"
  on public.routine_exercises for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exercises"
  on public.routine_exercises for update
  using (auth.uid() = user_id);

create policy "Users can delete own exercises"
  on public.routine_exercises for delete
  using (auth.uid() = user_id);


-- 4. MEALS
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  date date not null default current_date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.meals enable row level security;

create policy "Users can view own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can create own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meals"
  on public.meals for update
  using (auth.uid() = user_id);

create policy "Users can delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);


-- 5. MEAL ITEMS
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references public.meals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  calories integer default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  portion text, -- e.g. '1 cup', '200g'
  created_at timestamptz default now() not null
);

alter table public.meal_items enable row level security;

create policy "Users can view own meal items"
  on public.meal_items for select
  using (auth.uid() = user_id);

create policy "Users can create own meal items"
  on public.meal_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal items"
  on public.meal_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal items"
  on public.meal_items for delete
  using (auth.uid() = user_id);


-- 6. WORKOUT LOGS
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  routine_id uuid references public.routines(id) on delete set null,
  routine_name text not null, -- denormalized so it persists if routine is deleted
  date date not null default current_date,
  duration_minutes integer,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.workout_logs enable row level security;

create policy "Users can view own workout logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can create own workout logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own workout logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);


-- Indexes for common queries
create index idx_routines_user_id on public.routines(user_id);
create index idx_routine_exercises_routine_id on public.routine_exercises(routine_id);
create index idx_meals_user_id_date on public.meals(user_id, date);
create index idx_meal_items_meal_id on public.meal_items(meal_id);
create index idx_workout_logs_user_id_date on public.workout_logs(user_id, date);
