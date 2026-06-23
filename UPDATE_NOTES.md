# TRACE v7 — companion + fresh background

Adds a virtual companion that responds to independent effort, and replaces the
warm/brown background with a cooler tone.

## What changed

**A companion (Tamagotchi-style, but supportive)**
- At sign-up, students pick one of three companions (colourways: Sage, Tide, Clay).
- It sits at the top of the Track tab with a gentle idle animation (breathing,
  blinking; a little hop when thriving).
- Five moods, driven ONLY by recent independent effort and presence — never by
  AI use:
  - Thriving — lots of recent independent study
  - Happy — steady independent work
  - Content — ticking along
  - Sleepy — no logging in the last few days (gentle "wake me" nudge)
  - Drained — logging but very little independent effort (a nudge to do some
    work of your own; perks back up as soon as you do)
- AI use never lowers the mood. This keeps the companion a positive mascot for
  the student's own effort, consistent with the points system and your study's
  wellbeing aims.

**Fresh background** — the bone/brown is replaced with a calm cool-mist tone.

## Placeholder art (important)

The companion is drawn as simple built-in SVG as a PLACEHOLDER. It's wired so
proper character art can be dropped in later without touching app logic — see
the ART-SWAP NOTE at the top of `src/Companion.jsx`. When you have commissioned,
licensed, or generated artwork (one image per variant × mood, or per variant
with CSS for moods), swap the `Shape` component for an `<img>` and everything
else — the picker, the five moods, the animation hooks — keeps working.

## Tuning the moods

All thresholds are in `MOOD_CONFIG` in `src/Companion.jsx` (how many days count
as "recent", and the independent-minutes cutoffs for each mood). Adjust freely.

## Deploying v7

1. **Supabase → SQL Editor** → paste `supabase_migration_v7.sql` → Run.
   (Additive: adds a `companion` column to profiles, defaulting to 'sage'.
   No data touched.)
2. **Push the updated files** (GitHub Desktop → commit → push). New file:
   `src/Companion.jsx` — make sure it lands inside `src/`.
3. Hard-refresh `trace.lfcstudies.com`.

Existing accounts (created before v7) default to the Sage companion; new
sign-ups choose their own.

## Research note

The companion is an additional motivational layer. As with the points and
community features, it's part of the intervention — worth noting in your ethics
submission that the app shows a responsive companion driven by the student's
independent-study activity (and explicitly NOT by their AI use, by design).
