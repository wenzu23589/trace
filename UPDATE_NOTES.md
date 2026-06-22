# TRACE v4 — redesign + points system

A visual and scoring overhaul. No database changes — same schema as v3, so
this update is just files + push, no SQL to re-run.

## What changed

**Look & feel**
- New journal-style layout: a serif greeting, stat tiles, milestone progress,
  the weekly chart, then the daily log.
- Fresh light palette — mint-sage and soft apricot on a bone background.
  The deep teals are gone.
- Tabler icons added (loaded from CDN in index.html).

**Weekly chart**
- Replaced the paired vertical bars with horizontal "balance bars": one bar
  per day split into independent (mint) vs AI (apricot), with the
  **% independent** shown per day and a **week-average %** in the footer.
- Days with nothing logged show "—" rather than a misleading 0%.

**Points system (new, all tunable in `src/points.js`)**
- Independent study: 1 pt per 3 min, capped at 60/day (180 min).
- Tasks without AI: 10 pts each, up to 3/day (max 30).
- Reflection: 15 pts/day, minimum 20 words.
- Streak bonus: +2 per consecutive day, capped at +20.
- AI use: never scored, up or down. Logged only.
- Daily maximum: 125 pts.
- Milestones: 100 / 300 / 700 / 1400 / 2500 pts.
- The daily log now shows a live "this entry: N pts" estimate and the day's
  % independent as you move the sliders.

To change any weight, cap, or milestone, edit `src/points.js` — it's one
clearly-labelled config object. Note: changing the formula affects only
NEW or re-saved entries; previously stored point totals are not recomputed.

## Deploying v4

1. Copy the updated files into your `trace` folder (overwrite).
2. GitHub Desktop → commit → push. Same secrets, no new ones.
3. Hard-refresh `trace.lfcstudies.com` (Ctrl+Shift+R).

No Supabase SQL to run this time — the data model is unchanged.

## Note for your protocol

The points system rewards "study more, reflect more" and the community/
competition features rank on it. As before, describe these as deliberate
intervention design in your ethics submission. The daily cap is a wellbeing
safeguard (it removes the incentive to over-report or grind) — worth keeping.
