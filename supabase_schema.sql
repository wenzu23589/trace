-- ════════════════════════════════════════════════════════════════════════
-- TRACE database schema (run once in the Supabase SQL Editor)
-- EASE project, Study 2
-- ════════════════════════════════════════════════════════════════════════

-- Participants: one row per study participant.
create table if not exists participants (
  participant_id text primary key,
  name           text not null,
  joined_at      timestamptz not null default now()
);

-- Daily entries: one row per participant per day.
create table if not exists entries (
  id                  bigint generated always as identity primary key,
  participant_id      text not null references participants(participant_id) on delete cascade,
  entry_date          date not null,
  ai_minutes          integer not null default 0,
  independent_minutes integer not null default 0,
  independent_tasks   integer not null default 0,
  reflection          text,
  points              integer not null default 0,
  updated_at          timestamptz not null default now(),
  unique (participant_id, entry_date)
);

-- ────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- NOTE ON THE PROTOTYPE MODEL: this uses a participant CODE (e.g. "UM-0421")
-- rather than Supabase Auth accounts, so the anon key can insert/read rows.
-- The policies below permit anonymous insert + upsert + read, which is
-- appropriate for a low-risk proof-of-concept pilot. It does NOT stop a
-- participant who knows another participant's code from reading that record.
--
-- BEFORE A REAL DATA-COLLECTION PILOT, talk to your data protection / ethics
-- reviewer. The recommended hardening is to switch to Supabase Auth (one
-- account per participant) and scope every policy to auth.uid(). See the
-- README "Hardening for the pilot" section.
-- ────────────────────────────────────────────────────────────────────────

alter table participants enable row level security;
alter table entries      enable row level security;

-- Allow the anonymous (anon) role used by the browser to register and log.
create policy "anon can register participants"
  on participants for insert to anon with check (true);

create policy "anon can read participants"
  on participants for select to anon using (true);

create policy "anon can update participants"
  on participants for update to anon using (true) with check (true);

create policy "anon can insert entries"
  on entries for insert to anon with check (true);

create policy "anon can read entries"
  on entries for select to anon using (true);

create policy "anon can update entries"
  on entries for update to anon using (true) with check (true);

-- ────────────────────────────────────────────────────────────────────────
-- Exporting data for analysis: run this in the SQL Editor, then use the
-- "Download CSV" button, or query from R/Python via the service_role key.
-- ────────────────────────────────────────────────────────────────────────
-- select p.participant_id, p.name, e.entry_date, e.ai_minutes,
--        e.independent_minutes, e.independent_tasks, e.points, e.reflection
-- from entries e join participants p using (participant_id)
-- order by p.participant_id, e.entry_date;
