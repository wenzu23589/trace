-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v10 → v11  (ADDITIVE / safe)
-- Tracks whether a user has seen the guided tour. New users start false and
-- get the tour once; existing users default false too (so they'll see it once
-- as well — acceptable, and they can replay any time).
-- ════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists tour_done boolean not null default false;
