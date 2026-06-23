# TRACE v6 — avatars + full affiliation names in community

Two changes, both small to deploy.

## What changed

**Colourful avatars (no uploads, no personal data)**
- Each person now has a deterministic avatar generated from their alias:
  their initials on a colour picked by hashing the alias, with a soft accent.
  Same alias always produces the same avatar.
- Shown in the header (your own, highlighted) and beside every community row.
- No photos, no uploads, nothing to host or moderate — so no new personal
  data and no GDPR/biometric exposure.

**Community shows the specific affiliation**
- Small-group masking is removed: the community now always shows the full
  entity name (e.g. "Faculty of Engineering", "Institute of Digital Games")
  instead of just the type. This is why it previously showed only "Faculty"
  while you were testing with one or two accounts.

## Deploying v6

1. **Supabase → SQL Editor** → paste `supabase_migration_v6.sql` → Run.
   It only redefines the community view; no tables or data are touched.
2. **Push the updated files** (GitHub Desktop → commit → push). A new file,
   `src/Avatar.jsx`, is included — make sure it lands inside `src/` alongside
   TRACE.jsx and points.js.
3. Hard-refresh `trace.lfcstudies.com`.

## Important research / privacy note

You chose to REMOVE small-group masking. That means a participant who is the
only person from a small entity is now shown by their specific affiliation,
which — combined with their alias — can effectively identify them. That's fine
for testing. **Before the real pilot, strongly consider re-enabling masking**
(the one-line change is kept as a comment at the bottom of
`supabase_migration_v6.sql`), or note the re-identification risk explicitly in
your ethics submission. Showing the specific entity for tiny groups is a
deliberate reversal of a privacy safeguard, so it should be a documented choice.
