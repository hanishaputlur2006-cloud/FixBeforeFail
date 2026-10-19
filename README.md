# FixBeforeFail

Report problems before they become failures.

FixBeforeFail is an infrastructure early-warning platform. Citizens report public infrastructure problems, every report receives an explainable rule-based risk score, and authorities use those scores to fix what matters first.

## Tech stack

- React + Vite (frontend)
- React Router (pages), Leaflet + OpenStreetMap (map)
- Supabase (database, authentication, Row Level Security, photo storage)
- Plain CSS with design tokens in `src/styles/tokens.css`

## Running locally

Requires [Node.js](https://nodejs.org) 20 or newer and a [Supabase](https://supabase.com) project.

1. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **anon public** key
   (Supabase dashboard > Project Settings > API Keys). Never use the service role key here.
2. In the Supabase SQL Editor, run each file in `supabase/` once, in order (001, 002, ...).
3. In Supabase > Authentication > URL Configuration, set the Site URL to `http://localhost:5173`.
4. Start the app:

```bash
npm install     # first time only
npm run dev     # start the dev server at http://localhost:5173
npm test        # run the scoring and analytics tests
```

New accounts are citizens. To make an account an authority or maintenance worker, run in the SQL Editor:

```sql
update public.profiles set role = 'authority'  -- or 'worker'
where id = (select id from auth.users where email = 'person@example.com');
```

## Project structure

```
src/
  components/   reusable UI (logo, header, footer, badges)
  pages/        one folder or file per screen
  lib/          shared constants and, later, Supabase data access
  styles/       design tokens and global styles
```

## Status

- [x] Phase 1: project setup, design system, landing page
- [x] Phase 2: navigation and dashboard layouts
- [x] Phase 3: Supabase database and authentication
- [x] Phase 4: report submission, photos and listing
- [x] Phase 5: risk scoring engine (see docs/risk-scoring.md)
- [x] Phase 6: role-based dashboards and report lifecycle
- [x] Phase 7: maps, notifications, analytics and testing
