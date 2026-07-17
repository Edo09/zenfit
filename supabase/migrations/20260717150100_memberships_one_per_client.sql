-- ==========================================================================
-- Coach Admin Panel prerequisite: the panel treats "membership" as a single
-- record per client (status/plan/price/dates it edits in place), matching
-- the mobile app's own reads. Without a unique constraint on client_id,
-- `.upsert({ client_id, ... })` from the panel would INSERT a new row every
-- save (upsert conflicts on the PK by default, not client_id) instead of
-- updating the existing one — silently piling up duplicate membership rows.
--
-- This also lets PostgREST infer memberships as a TO-ONE relationship from
-- `profiles`, so `.select('*, membership:memberships(*)')` embeds a single
-- object instead of an array.
--
-- Safe to run once (dev-stage data): if a client already has more than one
-- membership row, this constraint will fail to apply — resolve duplicates
-- first (keep the newest, delete the rest) before re-running.
-- ==========================================================================

begin;

alter table public.memberships
  add constraint memberships_client_id_key unique (client_id);

commit;
