# TRACE v10 — in-app notifications (bell)

Admin-authored notifications delivered to a bell in the student header.

## What's new

**Bell in the header** — every student now has a bell icon with an unread
count badge. Clicking it opens a panel of notifications (newest first) and
marks them read. It refreshes about once a minute while the app is open.

**Send notifications (Admin tab)** — a new "Send a notification" card with a
title + message, and a target:
- **Everyone** (broadcast), or
- **A specific affiliation** (pick Faculty/School/Institute/Centre, then the
  specific one) — only students with that affiliation see it.
A "Sent notifications" list lets you review and delete past ones.

These are IN-APP notifications (reliable, fit the stack). They are NOT
device/browser push — the student sees them when they open TRACE, not as a
phone pop-up when the app is closed.

## Deploying v10

1. **Supabase → SQL Editor** → paste `supabase_migration_v10.sql` → Run.
   Adds two tables (`notifications`, `notification_reads`) with RLS so only
   admins can send and each user only sees their own read state. Additive,
   no existing data touched.
2. **Push the updated files** (commit → push). Changed: `src/supabaseClient.js`
   and `src/TRACE.jsx` (no new files this time).
3. Hard-refresh `trace.lfcstudies.com`. As an admin you'll see the new cards in
   the Admin tab; the bell appears for everyone.

## Research note

Targeted notifications send different messages to different affiliations — a
between-group difference. Like the challenges/competitions, if you use targeting
during the study it should be described deliberately in your methods and ethics
submission (what was sent, to whom, when). Broadcast notifications are the clean
default. The notification content is admin-authored, so keep it factual and
consistent with your protocol.
