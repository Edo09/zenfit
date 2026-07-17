-- ==========================================================================
-- GAP 1 fix (docs/COACH-ADMIN-PANEL-PRD.md §7): let the coach READ every
-- client's body measurements. The original table (20260710120000) only has
-- self-scoped policies, so the coach — and therefore the future Admin Web
-- Panel's tracking view — cannot see client weight/composition history.
--
-- Single-coach model: is_coach() is true only for the one gym-owner account.
-- Read-only for the coach (clients still own their own writes) — mirrors the
-- "coach reads all set logs / completions" policies.
--
-- Additive, idempotent. Run in the Supabase SQL editor.
-- ==========================================================================

begin;

drop policy if exists "coach reads all measurements" on public.body_measurements;
create policy "coach reads all measurements" on public.body_measurements for select
  using (public.is_coach());

commit;
