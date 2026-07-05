-- Meal photos: thumbnail per food item, stored in Supabase Storage.
-- Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/rzgwkwxskrovxnnymxqo/sql

-- 1) Where the item's photo lives in the meal-photos bucket ("<userId>/<uuid>.jpg")
alter table public.meal_items
  add column if not exists photo_path text;

-- 2) Public bucket: paths contain client-generated UUIDs (unguessable), and
--    public URLs keep thumbnails synchronous + cacheable offline by expo-image.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

-- 3) Writes stay owner-scoped: first path folder must equal auth.uid()
create policy "meal photos: users upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "meal photos: users delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
