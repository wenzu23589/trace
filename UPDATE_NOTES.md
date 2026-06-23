# TRACE v8 — per-activity logging (the big input change)

Replaces the "minutes" log with a far more reliable model: students log the
ACTIVITIES they did, and for each, how independently they worked and roughly
how long it took. Everything (points, companion, community) now derives from
this.

## Why this changed

Recalling "how many minutes did I use AI today?" after the fact is unreliable.
Anchoring to concrete activities ("I did some reading, wrote an essay section")
is far easier to remember and gives richer data — a reliance profile across
activity types, not one fuzzy number.

## The new model

Each day, the student adds activities. Defaults: Reading, Writing,
Brainstorming, Problem-solving, Revising/editing, Researching a topic — and
they can add their own custom ones.

For each activity:
- **Reliance** — a 7-point scale: All my own work · Almost all me · Mostly me ·
  Even mix · Mostly AI · Almost all AI · Entirely AI.
- **Rough time** — a 7-band scale (under 15 min … over 4 hrs), recorded for your
  data but mapped to a coarse short/medium/long weight (1/2/3) for scoring, so
  the maths doesn't over-trust fine time recall.

**Daily independence score (0–100)** = time-weighted average of independence
across activities. Custom activities fold into the same average, so adding more
activities can't inflate a total — exactly the averaging behaviour you asked for.

## How scoring follows

- Points scale with the day's independence score (up to 60), plus a small
  per-activity engagement bonus (capped at 15 so it can't be farmed), plus the
  reflection (15) and streak (up to 20) bonuses. Daily max 110.
- Companion mood reads off recent *average independence* (not minutes).
- The "Independent" streak counts days at >= 50% independence.
- Community ranks on points and shows each person's average independence %
  (AI use still never shown).
- All thresholds live in `src/points.js`, `src/activities.js`, and
  `src/Companion.jsx` (MOOD_CONFIG) — tune freely.

## Deploying v8

1. **Supabase → SQL Editor** → paste `supabase_migration_v8.sql` → Run.
   ADDITIVE: adds `activities` (jsonb) and `independence` columns to entries,
   and updates the community view. The old minute columns are left in place,
   untouched.
2. **Push the updated files** (GitHub Desktop → commit → push). New file:
   `src/activities.js` — make sure it lands inside `src/` with the others.
3. Hard-refresh `trace.lfcstudies.com`.

## Important research caveat

This changes TRACE's core behavioural metric from minutes to weighted reliance
across activities. It's a better, more reliable measure — but data logged under
the old minutes model is NOT comparable to new data. Finalise this BEFORE real
participants begin. Describe the activity-based reliance measure in your methods
(7-point reliance scale, time-banded weighting, weighted-average independence
score) — it's defensible and worth documenting precisely.
