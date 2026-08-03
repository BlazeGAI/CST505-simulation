# Module roadmap

This foundation pull request ships the application shell, the seeded simulation-engine contract,
versioned schemas, the Simulation Evidence Record, local draft storage, JSON/CSV/print export, the
accessibility approach, and the testing foundation — proven end to end by a small non-graded
reference simulation (`/demo`), but no graded module content. Each module below ships in its own
pull request, after the foundation is approved.

| Order | Module | Slug | Course week | Status |
| --- | --- | --- | --- | --- |
| 1 | System-Call Contracts | `system-call-contracts` | Week 1 | Available |
| 2 | Scheduling and Concurrency | `scheduling-and-concurrency` | Week 2 | Available |
| 3 | Virtual Memory | `virtual-memory` | Week 3 | Available |
| 4 | Crash Consistency | `crash-consistency` | Week 4 | Available |
| 5 | Virtualization and Isolation | `virtualization-and-isolation` | Week 5 | Available |
| 6 | Integrated Operating-System Failure Analysis | `integrated-failure-analysis` | Week 6 | Available |

Module metadata (title, summary, learning goals, status) lives in `src/lib/sim/modules.ts` — update
a module's `status` from `"planned"` to `"available"` as part of the PR that ships it.

## What every module pull request must include

Each module PR replaces its placeholder page (`src/app/modules/<slug>/page.tsx`) with a real,
interactive route and adds:

1. **A `SimulationDefinition`** in `src/lib/sim/<module-id>.ts` implementing the engine contract
   from `docs/architecture.md` (question 5): pure, deterministic `run(params, rng)`, a Zod
   `paramsSchema`/`resultSchema`, and a published `defaultParams`.
2. **Golden-seed tests** pinning exact outputs for specific (seed, params) pairs, plus a
   determinism test (same seed + params ⇒ identical result) and a params-validation test —
   following the pattern in `src/lib/sim/engine.test.ts`.
3. **The four scenario variants the brief requires for that week** (e.g. Week 1's normal, missing
   configuration, denied write, interrupted write), each resettable and each completing in the time
   budget the course design document specifies for that activity.
4. **Evidence outputs**: the module-specific tables/diagrams the course design document requires
   (e.g. Week 1's category-count table and annotated trace; Week 3's policy-comparison table and
   frame-allocation chart), each with a text/table equivalent, feeding into the shared
   `EvidenceRecordForm` and `ExportBar` rather than a bespoke form or export path.
5. **A keyboard workflow** covering predict → configure → run → compare → record → export using
   only the keyboard, verified in a Playwright test.
6. **Accessibility checks**: an `@axe-core/playwright` scan of the module's route(s) added to
   `e2e/accessibility.spec.ts`, plus any module-specific equivalents (e.g. a text table for a new
   Gantt-style timeline or boundary diagram).
7. **A completed-example dataset or seed** so a student who cannot run a local tool (Linux/WSL,
   Python, a browser with certain permissions) still has an equivalent path to the same evidence,
   per the course design document's repeated "equivalent dataset path" requirement.

## Order and dependencies

Modules 1-5 are independent of each other and can ship in any order once the foundation is merged.
Module 6 (Integrated Operating-System Failure Analysis) depends on the policy/parameter shapes
established by modules 2-5 (scheduling policy, memory controls, acknowledgment/recovery policy,
isolation limits), since its compound incident takes those as inputs — it should ship last.
