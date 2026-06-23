-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v9 → v10  (ADDITIVE / safe)
-- In-app bell notifications, authored by admins, broadcast or faculty-targeted.
--
-- notifications      : admin-authored messages (target_affiliation NULL = all)
-- notification_reads : which user has read which notification
-- ════════════════════════════════════════════════════════════════════════

create table if not exists notifications (
  id          bigint generated always as identity primary key,
  title       text not null,
  body        text not null,
  -- NULL = broadcast to everyone; otherwise only users with this affiliation
  target_affiliation text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists notification_reads (
  notification_id bigint references notifications(id) on delete cascade,
  user_id         uuid   references auth.users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table notifications      enable row level security;
alter table notification_reads enable row level security;

-- Everyone signed in can READ notifications (the app filters targeting client-side
-- against their own affiliation; targeting here is delivery, not secrecy).
drop policy if exists "read notifications" on notifications;
create policy "read notifications" on notifications
  for select to authenticated using (true);

-- Only admins can write notifications.
drop policy if exists "admins write notifications" on notifications;
create policy "admins write notifications" on notifications
  for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists "admins delete notifications" on notifications;
create policy "admins delete notifications" on notifications
  for delete to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- Each user manages only their OWN read records.
drop policy if exists "own reads select" on notification_reads;
create policy "own reads select" on notification_reads
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own reads insert" on notification_reads;
create policy "own reads insert" on notification_reads
  for insert to authenticated with check (user_id = auth.uid());
