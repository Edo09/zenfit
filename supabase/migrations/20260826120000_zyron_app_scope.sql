-- ==========================================================================
-- App scope for the SHARED database.
--
-- Two mobile apps now point at this same Supabase project:
--   'hokage' — the original coaching app (coach-managed clients)
--   'zyron'  — the second app, which has BOTH self-serve users and
--              coach-assigned ones
--
-- `account_type` ('coached' | 'solo') already exists but answers a different
-- question — *is this person coach-managed?* — and Zyron needs both kinds. So
-- it can't double as the app separator. This column is the orthogonal axis:
-- which app the profile belongs to, and therefore which admin panel lists it.
--
--   Hokage panel  ->  account_type = 'coached' AND app = 'hokage'
--   Zyron panel   ->  app = 'zyron'
--
-- The Zyron app self-tags `app = 'zyron'` right after signup, through the
-- existing "users update own profile" policy — no new RLS needed. Adding the
-- column NOT NULL with a default backfills every existing row to 'hokage' in
-- one shot, so no data step.
--
-- NOTE ON is_coach(): it is still GLOBAL — any profile with role = 'coach'
-- reads and writes every client of BOTH apps. That is fine while a single
-- person coaches both. The day Zyron gets its own coach account, this needs a
-- coach->client ownership column and an RLS rewrite; this column alone does
-- not isolate the two coaching practices.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

alter table public.profiles
  add column if not exists app text not null default 'hokage'
    check (app in ('hokage', 'zyron'));

comment on column public.profiles.app is
  'Which mobile app this profile belongs to. hokage = original coaching app; zyron = second app (self-serve + coach-assigned). Each admin panel filters on it. Orthogonal to account_type.';

-- The panels list clients by app, so the filter deserves an index.
create index if not exists idx_profiles_app on public.profiles(app);

commit;

-- Verify — expect every pre-existing profile on 'hokage':
--   select app, account_type, count(*)
--     from public.profiles group by 1, 2 order by 1, 2;
