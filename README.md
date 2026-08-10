# Replog — Workout Tracker

A minimal, phone-first workout logger. Log exercises, sets, reps, weight and rest; track progress over time; sync across devices. Hosted on GitHub Pages, backed by Supabase.

- **Session-based** logging (bundle exercises into a workout)
- **Supersets** (group exercises as A/B/C)
- **Dumbbell-aware** — weight is per hand; volume auto-×2
- **Progress chart** per exercise + full history
- **Email magic-link** login — private to you, syncs phone ↔ PC
- **Import your past workouts** from the seed data (parsed from your Sport folder)

---

## Setup (one time, ~10 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name; generate a strong DB password; choose a region close to you.
2. Wait ~2 min for provisioning.
3. Open **SQL Editor** → **New query** → paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the `exercises`, `sessions`, `sets` tables with Row-Level Security locked to your user.
4. **Authentication → Providers → Email** → make sure Email is enabled. (Magic links work out of the box.)
5. **Authentication → URL Configuration** → set the **Site URL** and add your GitHub Pages URL to **Redirect URLs** (e.g. `https://<your-username>.github.io/replog/`). Do this after step 3 below, once you know the URL.

### 2. Fill in the config

Open [`config.js`](config.js) and replace the two placeholders:

```js
export const SUPABASE_URL = "https://xxxxxxxxxxxxxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...your-anon-key...";
```

Find them in **Project Settings → API** → `Project URL` and `anon public` key.
The anon key is safe to commit — access is enforced by Row-Level Security, not by hiding the key.

### 3. Push to GitHub + enable Pages

```bash
cd /c/claude_code/Projects/Workout-Tracker
git init
git add .
git commit -m "Replog: workout tracker"
git branch -M main
gh repo create replog --public --source=. --remote=origin --push
gh api -X POST repos/<your-username>/replog/pages -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/"
```

(Replace `<your-username>` with your GitHub username — `S0fiane`.)

Then in the GitHub repo: **Settings → Pages** → confirm it's serving from `main` / root. Your app is live at `https://<your-username>.github.io/replog/`.

Go back to Supabase **Auth → URL Configuration** and add that URL to **Redirect URLs** (step 1.5).

### 4. Use it

1. Open the Pages URL on your phone (and/or PC).
2. Enter your email → **Send magic link** → open the email on that device → tap the link.
3. Your exercise library is pre-seeded on first login.
4. **Settings → Import past workouts** to load your history from the Sport folder.
5. Start logging.

---

## Run locally

```bash
cd /c/claude_code/Projects/Workout-Tracker
python -m http.server 8000
# open http://localhost:8000
```

(You still need `config.js` filled in and Supabase reachable. Add `http://localhost:8000` to Supabase Redirect URLs for local testing.)

---

## Files

```
index.html              entry
config.js               your Supabase URL + anon key
app/
  main.js               router + auth gate + bottom nav
  auth.js               magic-link auth
  db.js                 Supabase client + all queries
  seed.js               library seed + history import
  chart.js              inline-SVG line chart
  ui.js                 DOM helpers, icons, formatting
  views/                login, home, session, history, exercise, settings
styles/main.css         dark theme, mobile-first
supabase/
  schema.sql            tables + RLS (run in Supabase SQL editor)
  seed-data.json        exercise library + parsed history
```

---

## Notes & known gaps

- **Imported dates are best-effort.** Only your 29 Jan 2026 solo session has a real date in the source files; the other 10 sessions were undated in the chat logs and got sequential dates starting 1 Mar 2026 (the coaching-plan date). Edit any session's date in-app.
- **Sessions 1–6 full data is missing.** The source folder referenced a CSV (`1e7d82d2.csv`) that wasn't present. Only partial snippets were recoverable. If you find that CSV, drop it in and we can extend `seed-data.json`.
- **Rest times** were not historically logged, so imported sets have no rest value. It's a going-forward field.
- **Units:** kg only for now (a kg/lbs toggle is an easy future addition — one conversion function + a settings flag).
- **Future ideas:** PR detection, volume-per-week charts, kg/lbs toggle, rest timer, program templates (Day 1/2/3).