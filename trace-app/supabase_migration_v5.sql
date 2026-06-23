-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v4 → v5  (ADDITIVE — does NOT drop or wipe anything)
-- Safe to run on your live database.
--
-- Adds: is_admin flag on profiles, an admin_challenges table, and the RLS
-- so only admins can publish challenges (everyone can read them).
-- ════════════════════════════════════════════════════════════════════════

-- 1. Admin flag on profiles (defaults false for everyone).
alter table profiles add column if not exists is_admin boolean not null default false;

-- 2. Admin-published challenges (shown to everyone, above student competitions).
create table if not exists admin_challenges (
  id          bigint generated always as identity primary key,
  title       text not null,
  description text,
  metric      text not null default 'independent_minutes'
                check (metric in ('independent_minutes', 'points')),
  starts_on   date not null,
  ends_on     date not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table admin_challenges enable row level security;

-- Everyone signed in can READ admin challenges.
drop policy if exists "read admin challenges" on admin_challenges;
create policy "read admin challenges"
  on admin_challenges for select to authenticated using (true);

-- Only an admin (is_admin = true on their profile) can INSERT/UPDATE/DELETE.
drop policy if exists "admins insert challenges" on admin_challenges;
create policy "admins insert challenges"
  on admin_challenges for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "admins update challenges" on admin_challenges;
create policy "admins update challenges"
  on admin_challenges for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "admins delete challenges" on admin_challenges;
create policy "admins delete challenges"
  on admin_challenges for delete to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- ────────────────────────────────────────────────────────────────────────
-- MAKE YOURSELF ADMIN: after running the above, run this ONCE with your
-- own login email (the one you registered in the app):
--
--   update profiles set is_admin = true
--   where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
--
-- ────────────────────────────────────────────────────────────────────────
