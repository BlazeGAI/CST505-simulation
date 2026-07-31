# CST505 Simulation Suite

Six deterministic, browser-based operating-system simulation modules for **CST505: Advanced
Operating Systems Theory**, built as one Next.js application with no accounts, no server-side
database, and no student-data collection. See [`docs/architecture.md`](docs/architecture.md) for
the full design record and [`docs/roadmap.md`](docs/roadmap.md) for what ships in this foundation
versus each module's own pull request.

## What's here right now

This is the **foundation**: the application shell, navigation, the seeded simulation-engine
contract every module implements, versioned scenario/export schemas, the Simulation Evidence
Record, local draft storage, JSON/CSV/print-report export, the accessibility approach, and the
testing setup — proven end to end by a small non-graded reference simulation at `/demo`. The six
graded modules (system-call contracts, scheduling and concurrency, virtual memory, crash
consistency, virtualization and isolation, and integrated failure analysis) ship in their own
follow-up pull requests; today their routes are placeholders describing what's coming.

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
