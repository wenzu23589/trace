-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v5 → v6  (ADDITIVE / safe — only redefines one view)
-- Removes small-group masking: the community now always shows the specific
-- affiliation name. Run on your live database; no data is touched.
-- ════════════════════════════════════════════════════════════════════════

create or replace view community_scores
with (security_invoker = true) as
select
  p.id                                    as user_id,
  p.alias,
  p.affiliation_type,
  p.affiliation                           as affiliation_display,
  coalesce(sum(e.independent_minutes), 0) as total_independent_minutes,
  coalesce(sum(e.points), 0)              as total_points,
  coalesce(sum(e.independent_minutes) filter (where e.entry_date >= current_date - 6), 0) as week_independent_minutes
from profiles p
left join entries e on e.user_id = p.id
group by p.id, p.alias, p.affiliation_type, p.affiliation;

-- To RE-ENABLE masking later (recommended before the real pilot), run instead:
--
-- create or replace view community_scores with (security_invoker = true) as
-- with affiliation_counts as (select affiliation, count(*) as n from profiles group by affiliation)
-- select p.id as user_id, p.alias, p.affiliation_type,
--   case when ac.n >= 4 then p.affiliation else p.affiliation_type end as affiliation_display,
--   coalesce(sum(e.independent_minutes),0) as total_independent_minutes,
--   coalesce(sum(e.points),0) as total_points,
--   coalesce(sum(e.independent_minutes) filter (where e.entry_date >= current_date - 6),0) as week_independent_minutes
-- from profiles p
-- left join affiliation_counts ac on ac.affiliation = p.affiliation
-- left join entries e on e.user_id = p.id
-- group by p.id, p.alias, p.affiliation_type, p.affiliation, ac.n;
