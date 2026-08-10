---
title: "Replog — Project Kanban"
tags: [project, replog, kanban]
type: project
status: active
project: Workout-Tracker
created: 2026-08-10
updated: 2026-08-10
kanban-plugin: board
---

# Replog — Project Kanban

> Project management board for **Replog** — phone-first, cloud-synced workout tracker
> (vanilla JS + Supabase + GitHub Pages).
> Lanes are organized by layer. **Checked = shipped**, **unchecked = planned/to-do**.
> Add new cards under the relevant lane; mark done by checking the box.
> If the Obsidian Kanban plugin is installed, this file renders as a drag-and-drop board.

## System / Infra

- [x] GitHub Pages static hosting (S0fiane/replog)
- [x] No-build vanilla JS (ES modules) — no framework, no bundler
- [x] Vendored Supabase JS SDK (`vendor/supabase-js.min.js`) — no runtime CDN
- [x] `config.js` (SUPABASE_URL + anon publishable key)
- [x] Headless e2e verification harness (`verify-e2e.mjs`, mock-auth + puppeteer)
- [ ] Cache-busting strategy for module updates (versioned imports or service worker)
- [ ] CI: auto-deploy / status check on PR
- [ ] Custom domain + HTTPS hardening

## Backend / Data (Supabase)

- [x] `schema.sql` — exercises, sessions, sets
- [x] Row-Level Security (`user_id = auth.uid()`) on all tables
- [x] `db.js` data layer: exercises CRUD (list / create / upsert / delete)
- [x] Sessions CRUD: create / get / list / update / delete
- [x] Sets CRUD: add / update / delete / list (with exercise join)
- [x] Session lifecycle: createSession (draft) / startSession / finishSession / resetSession
- [x] `prepareProgramDay` — pre-fill session from a program template
- [x] Comparison query: `listSetsForExercise` (per-exercise history)
- [x] History-import idempotency (`findSessionsByDateName`)
- [ ] Indexes / query-performance audit
- [ ] Realtime sync (live cross-device updates)
- [ ] DB-backed custom programs (user-authored templates, CRUD)
- [ ] Scheduled backup / export to external store

## Auth

- [x] Magic-link email sign-in (`signInWithOtp`)
- [x] Password sign-in fallback (`signInWithPassword`)
- [x] Implicit auth flow (`flowType: implicit`) — fixes mobile in-app browser
- [x] Session restore on reload + auth-state subscription
- [x] Session-poll safety net for magic-link callbacks
- [x] Friendly auth error messages (rate-limit, invalid creds, network)
- [ ] OAuth (Google / Apple) for one-tap mobile login
- [ ] Account / profile management
- [ ] Share a read-only view with a coach

## Frontend / UI

- [x] Hash router (`main.js`) with auth gating
- [x] Bottom navigation (Home / Progress / Settings)
- [x] `ui.js` helpers: `el` (SVG-namespace-aware), `icon`, `topbar`, `toast`, formatting
- [x] Lucide-style inline SVG icon set
- [x] Dark theme + design tokens (`styles/main.css`)
- [x] Mobile-first, 44px touch targets, no horizontal scroll
- [x] Inline-SVG line chart (`chart.js`, no library)
- [x] Login view (email + password)
- [x] Home view (New session / Continue open / Recent)
- [x] New-session chooser (`#/new`: Blank + Pre-sets)
- [x] Session editor view
- [x] History list + session detail views
- [x] Exercise picker + exercise detail views
- [x] Settings view
- [ ] Light theme / theme toggle
- [ ] Skeleton loaders + richer empty states
- [ ] Offline mode + queued writes
- [ ] PWA (installable, manifest, app icon)
- [ ] Accessibility audit (screen-reader, focus traps, landmarks)

## Workout Features

- [x] Exercise library (personal, pre-seeded ~20 lifts)
- [x] Add custom exercises on the fly (autocomplete + create)
- [x] Session editor: add exercises, sets (reps / weight / rest)
- [x] Superset grouping (A / B / C) per exercise
- [x] Autosave sets (debounced + on blur)
- [x] Volume calc (kg/hand ×2 for dumbbell / kettlebell)
- [x] European decimal comma input normalization (3,6 → 3.6)
- [x] History import from Downloads/Sport (parsed PDF + chats)
- [x] Re-seed library (Settings)
- [x] JSON export / import (backup)
- [ ] Per-set notes
- [ ] Rest timer between sets (countdown)
- [ ] Exercise categories / muscle groups
- [ ] Warm-up set marking
- [ ] RPE / RIR logging
- [ ] Kg / Lbs toggle
- [ ] Reorder sets / exercises (drag)
- [ ] Duplicate session (repeat a past workout)

## Lifecycle / Chrono

- [x] Prepare → Start → Stop lifecycle (draft / active / finished)
- [x] Live elapsed timer in editor (per-second tick)
- [x] Total session duration (ended_at − started_at) on detail
- [x] Finish button (stamps `ended_at`)
- [x] Reset timer (clears start/end → re-time, keeps sets)
- [x] "Continue open session" (draft or active) from Home
- [ ] Pause / resume chrono (mid-session break)
- [ ] Per-exercise / per-set rest-timer history

## Programs / Pre-sets

- [x] `programs.js` template: Azamat 3-Day (Day 1 / 2 / 3)
- [x] Pre-fill session from a program day (exercises, sets, reps, superset, known weight)
- [x] "Pre-sets" label in New-session chooser
- [ ] Multiple programs / program switcher
- [ ] Edit / create programs in-app (DB-backed)
- [ ] Per-day weight targets (not just Slam Ball)
- [ ] Progression scheme (linear / double-progression auto-suggest)

## Analytics / Stats (v2)

- [ ] Session duration over time
- [ ] Volume per week / per muscle group
- [ ] PR badges + estimated 1RM
- [ ] Frequency / consistency calendar
- [ ] Workout streaks
- [ ] Export to CSV / share summary

## Backlog / Ideas

- [ ] Bodyweight / measurements tracking
- [ ] Exercise substitution suggestions
- [ ] Video / form-reference links per exercise
- [ ] Supabase Storage for profile / progress photos
- [ ] Sharing a session with a coach (read-only link)
- [ ] Notifications / workout reminders
- [ ] Apple Health / Google Fit integration

## Done (shipped this session)

- [x] Fix `className` SVG crash (SVGAnimatedString read-only)
- [x] Fix chart rendering (SVG namespace via `el()`)
- [x] Fix magic-link login loop (PKCE → implicit flow)
- [x] Edit past sessions (detail → Edit session button; Recent → editor)
- [x] Finish button + live session timer
- [x] Fix program pre-fill (`weight_kg` NOT NULL → insert 0)
- [x] Fold programs into New-session chooser (remove dedicated Home section)
- [x] Reset timer on started/finished sessions