# CST505 Simulation Suite

Six deterministic, browser-based operating-system simulation modules for **CST505: Advanced
Operating Systems Theory**, built as one Next.js application with no accounts, no server-side
database, and no student-data collection. See [`docs/architecture.md`](docs/architecture.md) for
the full design record and [`docs/roadmap.md`](docs/roadmap.md) for the module/activity map.

## What's here right now

The application includes all six graded investigations, deterministic engines and golden-seed
tests, the shared Simulation Evidence Record, local draft storage, JSON/CSV/print-report export,
and keyboard/accessibility checks. Course-facing labels match the revised design document:
Activities 1.3, 2.2, 3.2, 4.2, 5.2, and 6.2. The interface explicitly separates live or supplied
observation, simulated evidence, textbook interpretation, assumptions, unresolved questions, and
production limitations. Activity 6.2 validates and imports JSON packages from Simulations 2-5.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Production build (also type-checks). |
| `npm run start` | Serve a production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Vitest unit/component tests. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run test:e2e` | Playwright end-to-end + accessibility tests against a production build. |
| `npm run test:all` | Everything above, in CI order. |

`npm run test:e2e` builds and serves the app itself, so no dev server needs to be running first. It
expects a Chromium build available to Playwright; run `npx playwright install chromium` once if
your environment doesn't already provide one.

## Project structure

```
src/
  app/                     Routes (App Router): home, /modules/[slug], /demo, /docs
  components/              UI: site nav, evidence record form, export bar, the demo's UI
  lib/
    sim/                   Seeded RNG, the SimulationDefinition contract, the module registry,
                           and the foundation's reference demo simulation
    schemas/               Versioned Zod schemas: scenario config, run result, evidence record,
                           export package
    storage/               localStorage-backed draft persistence (no backend)
    export/                JSON/CSV export and browser download helper
docs/
  architecture.md          Stack, contracts, and the ten foundation architecture questions
  accessibility.md         The accessibility approach and how it's checked automatically
  roadmap.md               What each module's follow-up PR must include
e2e/                       Playwright end-to-end and accessibility (axe) tests
```

## Deployment

The app is a standard Next.js App Router project with no environment variables and no external
services, so deploying to Vercel is just connecting the repository — the Next.js framework preset
is auto-detected and no `vercel.json` is required. Every route in the foundation prerenders as
static content (`next build` reports it), so there is nothing to configure for the preview or
production environment beyond the default.
