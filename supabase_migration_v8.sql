-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v7 → v8  (ADDITIVE / safe)
-- Per-activity logging model.
--
-- Adds two columns to entries:
--   activities   jsonb  — list of {name, reliance(1-7), timeBand(0-6)}
--   independence integer — the day's time-weighted independence score 0..100
--
-- The old ai_minutes / independent_minutes / independent_tasks columns are
-- LEFT IN PLACE (not dropped) so existing rows/data are untouched; new logs
-- simply use the new columns. The community view is updated to rank on the
-- new independence score, falling back gracefully.
-- ════════════════════════════════════════════════════════════════════════

alter table entries add column if not exists activities   jsonb;
alter table entries add column if not exists independence  integer;

-- Community view: still AI-free. Now also surfaces average independence.
create or replace view community_scores
with (security_invoker = true) as
select
  p.id                                    as user_id,
  p.alias,
  p.affiliation_type,
  p.affiliation                           as affiliation_display,
  coalesce(sum(e.points), 0)              as total_points,
  coalesce(round(avg(e.independence)), 0) as avg_independence,
  count(e.id)                             as days_logged
from profiles p
left join entries e on e.user_id = p.id
group by p.id, p.alias, p.affiliation_type, p.affiliation;
