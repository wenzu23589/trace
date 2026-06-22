-- ════════════════════════════════════════════════════════════════════════
-- TRACE database schema v3 — pilot-grade, with academic-entity picker
-- EASE project, Study 2
--
-- v3 adds a two-level affiliation (affiliation_type + affiliation) covering
-- Faculties, Schools, Institutes and Centres, plus small-group masking in
-- the community view to limit re-identification.
--
-- MIGRATION NOTE: drops and recreates objects. Run on the existing project;
-- any v1/v2 TEST data is wiped (fine for test rows). Collect real pilot data
-- only after the schema is finalised.
-- ════════════════════════════════════════════════════════════════════════

drop view if exists community_scores;
drop table if exists competition_members;
drop table if exists competitions;
drop table if exists entries;
drop table if exists profiles;
drop table if exists participants;

-- ── Profiles ─────────────────────────────────────────────────────────────
-- affiliation_type is one of: Faculty | School | Institute | Centre
-- affiliation is the specific one (e.g. "Faculty of Engineering").
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  alias            text not null,
  affiliation_type text not null,
  affiliation      text not null,
  participant_id   text,
  consented        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ── Entries ───────────────────────────────────────────────────────────────
create table entries (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users(id) on delete cascade,
  entry_date          date not null,
  ai_minutes          integer not null default 0,
  independent_minutes integer not null default 0,
  independent_tasks   integer not null default 0,
  reflection          text,
  points              integer not null default 0,
  updated_at          timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ── Competitions (opt-in, anonymised) ───────────────────────────────────
create table competitions (
  id          bigint generated always as identity primary key,
  name        text not null,
  metric      text not null default 'independent_minutes'
                check (metric in ('independent_minutes', 'points')),
  starts_on   date not null,
  ends_on     date not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table competition_members (
  competition_id bigint not null references competitions(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  primary key (competition_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- COMMUNITY VIEW — the single shared, AI-free surface.
--
-- Excludes ai_minutes entirely. ALSO applies SMALL-GROUP MASKING: if fewer
-- than 4 people share an affiliation, the specific name is hidden and only
-- the type ("Institute", "Centre"...) is shown, so a person in a tiny entity
-- can't be singled out by name. Change the `>= 4` threshold to tune, or use
-- `p.affiliation` directly to disable masking.
-- ════════════════════════════════════════════════════════════════════════
create view community_scores
with (security_invoker = true) as
with affiliation_counts as (
  select affiliation, count(*) as n from profiles group by affiliation
)
select
  p.id                                    as user_id,
  p.alias,
  p.affiliation_type,
  case when ac.n >= 4 then p.affiliation else p.affiliation_type end as affiliation_display,
  coalesce(sum(e.independent_minutes), 0) as total_independent_minutes,
  coalesce(sum(e.points), 0)              as total_points,
  coalesce(sum(e.independent_minutes) filter (where e.entry_date >= current_date - 6), 0) as week_independent_minutes
from profiles p
left join affiliation_counts ac on ac.affiliation = p.affiliation
left join entries e on e.user_id = p.id
group by p.id, p.alias, p.affiliation_type, p.affiliation, ac.n;

-- ════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════
alter table profiles             enable row level security;
alter table entries              enable row level security;
alter table competitions         enable row level security;
alter table competition_members  enable row level security;

create policy "read all profiles"  on profiles for select to authenticated using (true);
create policy "insert own profile" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "read own entries"   on entries for select to authenticated using (auth.uid() = user_id);
create policy "insert own entries" on entries for insert to authenticated with check (auth.uid() = user_id);
create policy "update own entries" on entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read competitions"   on competitions for select to authenticated using (true);
create policy "create competitions" on competitions for insert to authenticated with check (auth.uid() = created_by);

create policy "read memberships"   on competition_members for select to authenticated using (true);
create policy "join competitions"  on competition_members for insert to authenticated with check (auth.uid() = user_id);
create policy "leave competitions" on competition_members for delete to authenticated using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────
-- RESEARCHER EXPORT (run in SQL Editor as the privileged role):
-- select pr.participant_id, pr.alias, pr.affiliation_type, pr.affiliation,
--        e.entry_date, e.ai_minutes, e.independent_minutes,
--        e.independent_tasks, e.points, e.reflection
-- from entries e join profiles pr on pr.id = e.user_id
-- order by pr.participant_id, e.entry_date;
-- ────────────────────────────────────────────────────────────────────────
