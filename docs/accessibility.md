# Accessibility approach

Target: WCAG 2.2 AA. The course design document requires accessible trace viewers, table/text
equivalents for every diagram or chart, and a working experience for students who cannot run
Linux/WSL or install anything locally — accessibility and the "browser-only, no privileged tools"
requirement are the same constraint, not two separate ones.

## Principles every module follows

1. **Semantic structure over styled `div`s.** Real headings (`h1`/`h2`/...) in document order, real
   `<button>`/`<label>`/`<table>` elements, landmark regions (`header`, `main`, `footer`, `nav`).
   `src/app/layout.tsx` provides a skip-to-content link and a persistent `<main id="main-content">`.
2. **Every visual has a text/table equivalent.** Sequence diagrams, Gantt-style timelines, boundary
   diagrams, and charts required by the brief must ship with an accessible table or list carrying
   the same information, not alt text alone — this is a hard requirement in the course design
   document ("Supply alt-text equivalents for any sequence diagram," "must have a table/text
   equivalent"). The foundation demo's trace view (`src/components/demo/reference-demo-client.tsx`)
   is a real `<table>` with `<caption>`, `scope="col"` headers, and per-run `<details>/<summary>`
   disclosure rather than a canvas drawing.
3. **Every workflow is keyboard-operable.** Tab order follows visual order; no control depends on
   drag, hover-only reveal, or a pointer gesture. `:focus-visible` gets a clear outline
   (`src/app/globals.css`). `e2e/accessibility.spec.ts` walks the demo's configure → run workflow
   using only `Tab`, `Space`, and `Enter`.
4. **Forms describe themselves.** Every input has a associated `<label htmlFor>`; help text is
   linked with `aria-describedby` rather than floated nearby and hoped-for (see
   `EvidenceRecordForm`). Validation errors use `role="alert"`.
5. **Color is never the only signal.** Status badges (`StatusBadge`) pair color with text
   ("Planned", "In development", "Available"); failure/dropped events in traces are labeled, not
   just colored.
6. **Motion respects user preference.** `prefers-reduced-motion: reduce` collapses animation and
   transition durations globally (`src/app/globals.css`).
7. **Contrast meets AA in both color schemes.** Body text and secondary/help text are checked
   against a 4.5:1 minimum on their actual background, in both light and dark mode — Tailwind's
   `slate-400` on a white background fails this (2.6:1) even though it looks reasonable at a
   glance, which is exactly the kind of thing that must be caught by tooling, not eyeballing (see
   below).
8. **Print output stays readable.** Interactive-only chrome (nav, buttons, forms' submit controls)
   is hidden with Tailwind's `print:hidden` variant so the printed/PDF report is the evidence
   record and results, not the UI shell.

## Automated checks

`e2e/accessibility.spec.ts` runs `@axe-core/playwright` against every foundation route and fails
the build on any detected violation, plus a keyboard-only pass through the demo's primary
workflow. This is wired into CI (`.github/workflows/ci.yml`) so a regression is caught before merge,
not discovered later. It already caught one real issue during this PR: a helper-text color that
failed the 4.5:1 contrast minimum, fixed in `evidence-record-form.tsx` and
`reference-demo-client.tsx`.

Automated scanning catches contrast, missing labels, missing landmarks, and similar structural
issues, but it cannot verify that a keyboard workflow is *sensible* or that a text equivalent is
*accurate* — each module PR should include a short manual keyboard walkthrough of its own workflow
in the PR description in addition to the automated checks.
