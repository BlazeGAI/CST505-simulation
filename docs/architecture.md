# Architecture

This document is the design record for the CST505 Simulation Suite foundation. It covers the
technology stack, the shared contracts every module builds on, and the ten architecture questions
the foundation pull request answers before any of the six graded modules are implemented.

## What this foundation ships

- A single Next.js (App Router) application, deployable to Vercel with no configuration beyond
  connecting the repository.
- A module registry (`src/lib/sim/modules.ts`) describing the six CST505 simulation modules and
  their status, plus placeholder pages (`src/app/modules/[slug]`) that will become each module's
  real UI in its own pull request.
- A seeded simulation-engine contract (`src/lib/sim/engine.ts`, `src/lib/sim/random.ts`) that every
  module implements, proven end to end by a small non-graded "foundation engine demo"
  (`src/lib/sim/reference-demo.ts`, `/demo`).
- Versioned Zod schemas for scenario configuration, run results, the Simulation Evidence Record,
  and the combined export package (`src/lib/schemas/`).
- A reusable Simulation Evidence Record form (`src/components/evidence/evidence-record-form.tsx`).
- Local-only draft persistence via `localStorage` (`src/lib/storage/`) — no accounts, no backend.
- JSON, CSV, and print-ready report export (`src/lib/export/`, `src/components/evidence/export-bar.tsx`).
- An accessibility approach (see `docs/accessibility.md`) checked automatically with axe.
- A testing foundation: Vitest for unit/component tests, Playwright + `@axe-core/playwright` for
  end-to-end and automated accessibility checks, and a GitHub Actions workflow that runs all of it.

## Ten architecture questions

### 1. What is the stack, and what versions does it pin?

Next.js 16.2.12 (App Router, React Server Components, Turbopack build) on React 19.2.4, written in
TypeScript 5 with strict mode on. Styling is Tailwind CSS v4 (utility classes, no component
library, no CSS-in-JS) so every module can stay visually consistent without a shared design-system
dependency. Data shapes are validated with Zod v4. There is no backend framework, ORM, or database
driver anywhere in the dependency tree — the app is 100% client-renderable static content plus a
thin set of client components for interactivity, which is also why it deploys to Vercel with zero
configuration (Vercel auto-detects the Next.js framework preset). Exact versions are pinned in
`package.json`; `npm ci` in CI guarantees reproducible installs.

### 2. Why one Next.js app instead of a monorepo of six module apps?

The brief asks for "one Vercel-hosted Next.js application containing six ... modules," and a single
app is also the simpler choice technically: the six modules share one engine contract, one evidence
schema, one export pipeline, and one accessibility baseline, so splitting them into separate
deployable apps would mean either duplicating that shared code six times or building package
infrastructure (a monorepo with a shared internal package) purely to avoid duplication with no
corresponding benefit — nothing about the modules needs independent deployment, independent
scaling, or independent release cadence. Each module instead gets its own route under
`src/app/modules/<slug>` (navigation/placeholder today, full UI in that module's PR) and its own
files under `src/lib/sim/<module-id>.ts`, so module PRs touch disjoint files and can be reviewed and
merged independently even though they ship in one app.

### 3. What is the data model, and how do a scenario, a run, and the evidence record relate?

Four Zod schemas in `src/lib/schemas/` form the model:

- **`ScenarioConfig`** (`scenario-config.ts`) — a versioned envelope around a module's own
  `params` object, plus `moduleId`, `scenarioId`, and `seed`. Each module defines its own params
  shape (via `SimulationDefinition.paramsSchema`); the envelope is what storage and export code
  handle without needing to know any module's internals.
- **`RunResult`** (`run-result.ts`) — the output of one deterministic run: `metrics` (a flat
  number map, for comparison tables) and `trace` (an ordered list of inspectable events, for the
  annotated-trace requirement in the brief). Each module's real UI can render richer detail on top
  of this envelope.
- **`EvidenceRecord`** (`evidence-record.ts`) — the revised course evidence fields: live or supplied
  observation, model and assumptions, prediction, parameters tested, simulated results,
  evidence-source comparison, cited interpretation, architecture implication, counterexample or
  complication, unresolved question, and limitation. The legacy `preparedBy` storage key is shown
  as a non-identifying evidence-package label for backward compatibility.
- **`ExportPackage`** (`export-package.ts`) — what a student actually exports: every kept run
  (`{ config, result }` pairs) plus one evidence record, stamped with `exportedAt` and `appVersion`.
  Version 2 can also identify an explicit `selectedRun`, so an integrated module imports the
  student's chosen policy rather than guessing from run order.

A student can keep multiple runs (to compare parameters or seeds) against one evidence record per
scenario, matching the brief's "run and compare deterministic simulations" requirement.

### 4. Where does state live, and what is persisted?

Nowhere but the browser. `src/lib/storage/local-draft-store.ts` wraps `window.localStorage` behind
a small, SSR-safe API (`readDraft`/`writeDraft`/`clearDraft`), namespaced by module, scenario, and
kind (`config` | `evidence` | `runs`). The `useLocalDraft` hook (`use-local-draft.ts`) mirrors a
piece of React state to a storage key, debounced, and hydrates from any existing draft after mount
so the server-rendered markup and the first client render never mismatch. There is no account
system, no server-side database, and no network call that a student's work is ever sent through —
the only way an evidence record leaves the browser is the export buttons the student clicks. This
directly satisfies "no accounts, a database, or student-data collection" for the initial release,
and it means the app can be entirely statically generated (see `next build` output: every route
today prerenders as static content).

### 5. What makes a simulation "deterministic," and how is that enforced?

Every module implements `SimulationDefinition<TParams, TResult>` (`src/lib/sim/engine.ts`):
`paramsSchema`, `resultSchema`, `defaultParams`, and a pure `run(params, rng)` function. `rng` is a
`SeededRandom` (`src/lib/sim/random.ts`), a small mulberry32-based generator: same seed, same
sequence, on any machine. The contract's only rule is that `run()` may not read `Math.random()`,
`Date.now()`, or any other non-deterministic source — all randomness must come from the provided
generator (`SeededRandom.fork()` lets a module derive independent sub-streams, e.g. one per
workload class, without breaking reproducibility). This is what makes "golden seed" tests possible:
`src/lib/sim/engine.test.ts` pins exact outcomes for specific (seed, params) pairs on the reference
demo, and every module PR is expected to add the same kind of test for its own scenarios.

### 6. How are scenario and export formats versioned?

Every persisted or exported document embeds a `schemaVersion` integer, defined once in
`src/lib/schemas/version.ts` (`SCHEMA_VERSIONS`). Zod schemas use `z.literal(SCHEMA_VERSIONS.x)` for
that field, so parsing an unknown version fails loudly instead of silently misreading an old draft
or export. Because the version lives inside the data (not just in a filename or release tag), an
older record can be migrated explicitly rather than guessed at. Export-package version 2 adds an
optional explicit selected-run reference; the importer continues accepting version 1 packages and
preserves their historical newest-matching-run behavior. Module-specific parameter shapes remain
inside each module's own `paramsSchema`/`resultSchema`.

### 7. What are the required exports, and how are they produced?

Three formats, all produced client-side with no server round-trip:

- **JSON** (`src/lib/export/json.ts`) — the full `ExportPackage`, pretty-printed, machine-readable.
- **CSV** (`src/lib/export/csv.ts`) — a per-run metrics table (columns derived from the union of
  every run's metric keys) followed by a key/value table of the evidence record, so the file opens
  cleanly in a spreadsheet without inventing a second export format.
- **Print-ready report** — the browser's own print dialog (`window.print()`), styled with Tailwind's
  `print:` variant to hide interactive controls (`ExportBar`, forms' submit buttons, the site nav)
  and leave a clean, readable report. This satisfies "a print-ready report" without a second
  rendering path to maintain, and it works offline since it's just CSS.

`ExportBar` (`src/components/evidence/export-bar.tsx`) takes a `buildPackage()` callback from the
calling module, so it never needs to know a module's params or metric shapes — every module PR
reuses this component as-is.

### 8. What is the accessibility approach, and how is it checked automatically?

See `docs/accessibility.md` for the full approach (semantic structure, keyboard operability, table
equivalents for every visual, WCAG 2.2 AA color contrast). Automated coverage lives in
`e2e/accessibility.spec.ts`: `@axe-core/playwright` scans every foundation route for violations
(this caught and fixed a real contrast bug during this PR — see the `text-slate-500` fix in
`evidence-record-form.tsx`), and a keyboard-only walkthrough exercises the demo's primary workflow.
Every module PR is expected to add the same two kinds of checks for its own routes.

### 9. What does the testing foundation cover, and what must a module PR add?

- **Unit tests** (Vitest): `SeededRandom` determinism (`random.test.ts`), the engine contract with
  golden-seed assertions (`engine.test.ts`), and every schema's accept/reject behavior
  (`schemas.test.ts`), plus JSON/CSV export correctness including CSV escaping (`export.test.ts`).
- **Component tests** (Vitest + Testing Library): the evidence record form renders a labeled,
  described control for every required field and reports changes correctly
  (`evidence-record-form.test.tsx`).
- **End-to-end tests** (Playwright): the full predict → configure → run → compare → record →
  export workflow against a real browser and a real production build (`e2e/smoke.spec.ts`).
- **Accessibility tests** (Playwright + axe): automated violation scanning and a keyboard-only
  workflow check (`e2e/accessibility.spec.ts`).
- **CI** (`.github/workflows/ci.yml`): lint, typecheck, unit tests, production build, then the full
  Playwright suite (installing Chromium in the runner), on every push and pull request.

Each module's follow-up PR is expected to add: a golden-seed unit test for its own scenarios, a
component/e2e test for its keyboard workflow, and an axe scan for its route(s) — the same four
categories, extended rather than reinvented.

### 10. What is explicitly out of scope, and how is that boundary enforced?

No accounts, no server-side database, no student-data collection, and no LLM integration in the
initial release — and no real operating-system, container, or virtual-machine execution: every
module is an instructional model of the relevant mechanism, not a wrapper around a live kernel,
Docker, or a hypervisor. Technically, this is enforced by what the codebase simply does not
contain: there is no auth dependency, no database client, no server actions that write anywhere
persistent, and no `child_process`/container/VM SDK anywhere in `package.json`. Every
`SimulationDefinition.run()` is a pure, synchronous, in-process function — architecturally, it
could not shell out to a real OS facility even if a future module tried to, without that dependency
being an obvious, reviewable addition to `package.json` and an obvious violation of the
determinism contract in question 5.
