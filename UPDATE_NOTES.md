# TRACE v9 — self-insight features (no database change)

Three features that reflect the student's own logged data back to them. All
read existing data — there is NO migration to run for v9.

## What's new

**1. Reliance by activity type**
On the Track tab, a "Your patterns" card shows average independence for each
activity type (Reading, Writing, etc.) over a chosen window. Lets a student see
where they work independently and where they lean on AI most — self-knowledge,
not judgement.

**2. Independence trend over time**
A weekly-averaged line of independence %, framed as the student's own
trajectory (not vs others). Hovering a week point shows that week's daily
values. Mastery-over-time made visible.

**Window selector** — both share a 14 days / 30 days / All time toggle.

**3. Adaptive reflection prompt**
The reflection box now shows a gentle, tailored hint above a neutral note box,
chosen by rule from the day's logged pattern (e.g. if a student leaned on AI
most for writing, it gently asks what part they might draft themselves first).
It is:
- rule-based only — no AI, fully transparent/auditable
- supportive in tone — never scolds AI use
- collects nothing new — just changes which question is shown

## Deploying v9

NO database migration needed. Just:
1. Push the updated files (GitHub Desktop → commit → push). Changed:
   `src/activities.js` (new helpers), `src/TRACE.jsx` (Insights + adaptive
   prompt).
2. Hard-refresh `trace.lfcstudies.com`.

## Research note

Features 1 and 2 are neutral mirrors of logged data. Feature 3 is a light
intervention component — it nudges attention based on behaviour. Worth
describing in your methods/ethics as an adaptive reflection prompt (rule-based,
supportive), distinct from the purely descriptive feedback. The prompt rules
live in `adaptivePrompt()` in `src/activities.js` if you want to review or
reword them.
