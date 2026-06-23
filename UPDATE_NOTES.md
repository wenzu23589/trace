# TRACE v12 — Today / Dashboard split

The old single "Track" page is split into two tabs, and the tour updated to match.

## What changed

- **Today** tab (opens here): the companion + the daily activity log. The "do"
  tab — the daily action.
- **Dashboard** tab: the companion + streaks + points/milestone + weekly
  independence chart + "Your patterns" insights. The "review" tab.
- The companion appears on BOTH tabs (it's the mascot).
- Community / Competitions / Admin unchanged.
- App now opens on Today.

**Tour updated** — the guided tour now switches tabs as it steps (log → Today,
streaks → Dashboard, etc.) so each highlight lands on a visible element. Ends
back on Today. Still auto-shows once for new users and replays from "How it works".

## Deploying v12

NO database migration. Just:
1. Push the updated files (commit → push). Changed: `src/TRACE.jsx`, `src/Tour.jsx`.
2. Hard-refresh trace.lfcstudies.com.
