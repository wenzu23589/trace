# TRACE

**Tracking Reliance in AI to Champion academic self-Efficacy**
Prototype for the EASE project (Study 2). React + Vite front-end, Supabase backend, deployed on GitHub Pages at **trace.lfcstudies.com**.

Rule-based, no AI components — by design.

---

## What you're setting up

```
Browser (React app)  ──►  Supabase (Postgres)   ◄── you export CSV for analysis
        ▲
        │ served as static files from
   GitHub Pages  ──► trace.lfcstudies.com
```

There are four one-time jobs. None of them require code changes. Budget ~30 minutes.

1. Create the Supabase database
2. Put this project in a GitHub repo
3. Add your Supabase keys as GitHub secrets and turn on Pages
4. Point your domain at GitHub

---

## 1. Supabase (the database)

1. Create a free account at supabase.com and make a new project. Pick a region close to Malta (e.g. Frankfurt/`eu-central`). Save the database password somewhere safe.
2. In the project, open **SQL Editor**, paste the contents of [`supabase_schema.sql`](./supabase_schema.sql), and run it. This creates the `participants` and `entries` tables and their access policies.
3. Open **Project Settings → API** and copy two values:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon public** key → this is your `VITE_SUPABASE_ANON_KEY`

The anon key is meant to live in the browser; it only grants what the table policies allow. Do **not** use the `service_role` key in the app — keep that for your own exports.

### Test locally first (optional but recommended)

```bash
cp .env.example .env        # then paste your two real values into .env
npm install
npm run dev                 # open the printed localhost URL
```

Register a test participant, add a log, and confirm a row appears in Supabase under **Table Editor → entries**.

---

## 2. GitHub repo

Create a new repo (e.g. `trace-app`) and push this folder to its `main` branch:

```bash
git init
git add .
git commit -m "TRACE prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/trace-app.git
git push -u origin main
```

`.env` is git-ignored, so your keys are not pushed. Good.

---

## 3. Secrets + enable Pages

In the repo on github.com:

1. **Settings → Secrets and variables → Actions → New repository secret.** Add both:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.

The included workflow ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) builds the site with your secrets and deploys on every push to `main`. Watch it run under the **Actions** tab.

---

## 4. Custom domain (trace.lfcstudies.com)

The `public/CNAME` file already contains `trace.lfcstudies.com`, so GitHub will claim the domain on deploy. You just need DNS.

At whoever manages DNS for **lfcstudies.com**, add a **CNAME** record:

| Type  | Name (host) | Value                       |
| ----- | ----------- | --------------------------- |
| CNAME | `trace`     | `YOUR-USERNAME.github.io`   |

Then in the repo: **Settings → Pages → Custom domain**, enter `trace.lfcstudies.com`, save, and once it verifies tick **Enforce HTTPS**. The certificate can take a few minutes to an hour to issue.

> If `lfcstudies.com` is behind Cloudflare, add the same CNAME but set the record to **DNS only** (grey cloud) until GitHub has issued the certificate, then you may proxy it.

Done — the app is live.

---

## Exporting data for analysis

In Supabase **SQL Editor**, run the export query at the bottom of `supabase_schema.sql` and use **Download CSV**, or connect from R/Python with the `service_role` key for a reproducible pipeline.

---

## Hardening for the pilot (read before collecting real data)

This prototype identifies students by a **participant code**, not a password-protected account. That's fine for a demo, but for the actual 40–50 student pilot you should review the model with your ethics / data-protection reviewer. The main recommended change is to switch to **Supabase Auth** (one login per participant) and scope every table policy to `auth.uid()`, so each participant can only read and write their own rows. The current policies (in `supabase_schema.sql`) allow any anonymous client to read entries, which is not appropriate for GDPR-governed personal data at pilot scale.

Other pre-pilot considerations: a consent screen before registration, a privacy notice naming the data controller and retention period (your EASE form already commits to specifics), and minimising what's stored (the reflection free-text field in particular may contain personal data).

I can implement the Supabase Auth version when you're ready for it.

---

## Project layout

```
trace-app/
├─ index.html
├─ package.json
├─ vite.config.js
├─ supabase_schema.sql        ← run once in Supabase
├─ .env.example               ← copy to .env for local dev
├─ public/CNAME               ← trace.lfcstudies.com
├─ .github/workflows/deploy.yml
└─ src/
   ├─ main.jsx
   ├─ TRACE.jsx               ← the app
   └─ supabaseClient.js       ← data layer
```
