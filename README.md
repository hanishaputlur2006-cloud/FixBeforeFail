# FixBeforeFail

Report problems before they become failures.

FixBeforeFail is an infrastructure early-warning platform. Citizens report public infrastructure problems, every report receives an explainable rule-based risk score, and authorities use those scores to fix what matters first.

## Tech stack

- React + Vite (frontend)
- React Router (pages)
- Supabase (database, authentication, storage), planned for phase 3
- Plain CSS with design tokens in `src/styles/tokens.css`

## Running locally

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install     # first time only
npm run dev     # start the dev server at http://localhost:5173
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
- [ ] Phase 2: navigation and dashboard layouts
- [ ] Phase 3: Supabase database and authentication
- [ ] Phase 4: report submission, photos and listing
- [ ] Phase 5: risk scoring engine
- [ ] Phase 6: role-based dashboards and report lifecycle
- [ ] Phase 7: maps, notifications, analytics and testing
