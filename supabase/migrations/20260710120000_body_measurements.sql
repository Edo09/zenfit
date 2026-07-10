-- P1 · Body-measurement history
-- profiles.weight_kg is overwritten on every update, so there is no trend to
-- chart. This table keeps one row per user per day; a trigger mirrors any
-- profiles.weight_kg change into today's row so the existing profile/weight
-- flows keep working with no code change, and the progress dashboard's weight
-- card gains real history.

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  waist_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(4,1),
  thigh_cm numeric(5,1),
  created_at timestamptz default now() not null,
  unique (user_id, measured_on)
);

create index if not exists idx_body_measurements_user_date
  on public.body_measurements (user_id, measured_on);

alter table public.body_measurements enable row level security;

create policy "Users can view own measurements"
  on public.body_measurements for select
  using (auth.uid() = user_id);

create policy "Users can create own measurements"
  on public.body_measurements for insert
  with check (auth.uid() = user_id);

create policy "Users can update own measurements"
  on public.body_measurements for update
  using (auth.uid() = user_id);

create policy "Users can delete own measurements"
  on public.body_measurements for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.body_measurements to authenticated;

-- Optional target for the goal-aware weight card (nullable; unused until set).
alter table public.profiles add column if not exists target_weight_kg numeric(5,2);

-- Mirror profiles.weight_kg → today's body_measurements row on any change.
create or replace function public.sync_weight_measurement()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.weight_kg is not null
     and new.weight_kg is distinct from old.weight_kg then
    insert into public.body_measurements (user_id, measured_on, weight_kg)
    values (new.id, current_date, new.weight_kg)
    on conflict (user_id, measured_on)
    do update set weight_kg = excluded.weight_kg;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_weight_change on public.profiles;
create trigger on_profile_weight_change
  after update of weight_kg on public.profiles
  for each row execute function public.sync_weight_measurement();

-- Backfill one row per user from the current profiles.weight_kg snapshot.
insert into public.body_measurements (user_id, measured_on, weight_kg)
select id, current_date, weight_kg
from public.profiles
where weight_kg is not null
on conflict (user_id, measured_on) do nothing;
