-- ════════════════════════════════════════════════════════════════════════
-- TRACE migration v6 → v7  (ADDITIVE / safe)
-- Adds the chosen companion variant to profiles. No data touched.
-- ════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists companion text not null default 'sage';
