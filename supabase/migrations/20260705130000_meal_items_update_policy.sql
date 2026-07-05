-- Editing food items syncs as an upsert (INSERT ... ON CONFLICT DO UPDATE),
-- which needs an UPDATE policy on meal_items. Idempotent: only creates one
-- if no UPDATE policy exists yet.
-- Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meal_items'
      and cmd = 'UPDATE'
  ) then
    create policy "meal_items: users update own"
      on public.meal_items for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
