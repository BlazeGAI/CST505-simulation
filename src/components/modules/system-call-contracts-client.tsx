"use client";

import { useMemo, useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import {
  systemCallContractsModule,
  findFirstDivergenceIndex,
  SCENARIOS,
  SCENARIO_LABELS,
  SYSCALL_CATEGORIES,
  ASSESSED_SEED,
  WORKED_EXAMPLE_SEED,
  type Scenario,
  type SyscallCategory,
} from "@/lib/sim/system-call-contracts";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";
import { CourseEvidenceContext } from "@/components/modules/course-evidence-context";

const MODULE_ID = "system-call-contracts";
const MODULE_TITLE = "System Boundaries Investigation";
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

const CATEGORY_LABELS: Record<SyscallCategory, string> = {
  process: "Process",
  file: "File",
  memory: "Memory",
  communication: "Communication",
  protection: "Protection",
};

function runScenario(scenario: Scenario, seed: number): StoredRun {
  const result = runSimulation(systemCallContractsModule, { scenario }, seed);
  const config = createScenarioConfig({
    moduleId: MODULE_ID,
    scenarioId: scenario,
    seed,
    params: { scenario },
  });
  return { config, result };
}

export function SystemCallContractsClient() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [selectedCategories, setSelectedCategories] = useState<Set<SyscallCategory>>(
    new Set(SYSCALL_CATEGORIES),
  );

  const runsDraft = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "assessed", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: ASSESSED_SEED }),
  );

  const referenceNormalTrace = useMemo(
    () => runSimulation(systemCallContractsModule, { scenario: "normal" }, ASSESSED_SEED).trace,
    [],
  );
  const workedExample = useMemo(() => runScenario("denied-write", WORKED_EXAMPLE_SEED), []);

  function toggleCategory(category: SyscallCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function handleRun() {
    const next = [runScenario(scenario, ASSESSED_SEED), ...runsDraft.value].slice(0, MAX_RUNS);
    runsDraft.setValue(next);
  }

  function renderTrace(run: StoredRun) {
    const divergenceIndex =
      run.config.scenarioId === "normal" ? null : findFirstDivergenceIndex(referenceNormalTrace, run.result.trace);
    const filtered = run.result.trace.filter(
      (event) => !event.meta || selectedCategories.has(event.meta.category as SyscallCategory),
    );
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">
            Ordered system-call trace for the {SCENARIO_LABELS[run.config.scenarioId as Scenario]} scenario
          </caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Category</th>
              <th scope="col" className="py-1 pr-4">Call</th>
              <th scope="col" className="py-1 pr-4">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((event) => {
              const isDivergence = event.index === divergenceIndex;
              return (
                <tr
                  key={event.index}
                  className={
                    isDivergence
                      ? "border-b border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-b border-slate-100 dark:border-slate-900"
                  }
                >
                  <td className="py-1 pr-4">
                    {event.index}
                    {isDivergence && (
                      <span className="ml-1 rounded bg-amber-200 px-1 text-xs font-semibold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                        first divergence
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-4">{String(event.meta?.category ?? "")}</td>
                  <td className="py-1 pr-4 font-mono text-xs">{event.detail}</td>
                  <td className="py-1 pr-4">{event.timestamp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 1 &middot; Activity 1.3 &middot; CLO 4</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        A small, fictional HarborLink sensor-ingestion program crosses the user-kernel boundary in a
        fixed order: read a sensor CSV, load a configuration file, announce readiness, write an
        alert log, and exit. This is an instructional model of that boundary, not a live strace
        capture &mdash; every call, argument, return value, and PID below is generated
        deterministically from a seed, not observed from a real process.
      </p>
      <CourseEvidenceContext moduleId={MODULE_ID} />

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running a failure scenario, write in the evidence record below which call you
          expect to fail first, and what return value and errno the operating system should report
          at that boundary.
        </p>
      </section>

      <section className="print:hidden mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          2. Configure and run
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{ASSESSED_SEED}</strong> is the published default for this investigation
          &mdash; keep it for your assessed submission so your results are comparable to your
          classmates&apos;. Run the normal scenario and at least one failure scenario to compare.
        </p>
        <form
          className="mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div>
            <label htmlFor="scenario" className="block text-sm font-medium">
              Scenario
            </label>
            <select
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {SCENARIO_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Run simulation
          </button>
          {runsDraft.value.length > 0 && (
            <button
              type="button"
              onClick={() => runsDraft.setValue([])}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear run history
            </button>
          )}
        </form>
      </section>

      <section className="print:hidden mt-6">
        <details className="rounded-md border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <summary className="cursor-pointer text-sm font-medium">
            Worked example (seed {WORKED_EXAMPLE_SEED}, denied log-file write) &mdash; demonstration
            only
          </summary>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This uses a different seed than your assessed run, so it cannot disclose your assessed
            results. Category counts: {" "}
            {SYSCALL_CATEGORIES.map((c) => `${CATEGORY_LABELS[c]} ${workedExample.result.metrics[`calls_${c}`]}`).join(
              ", ",
            )}
            . Exit code {workedExample.result.metrics.exitCode}.
          </p>
          {renderTrace(workedExample)}
        </details>
      </section>

      <section className="mt-8" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-lg font-semibold">
          3. Compare results
        </h2>

        <fieldset className="print:hidden mt-3">
          <legend className="text-sm font-medium">Filter trace by category</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {SYSCALL_CATEGORIES.map((category) => (
              <label key={category} className="inline-flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategories.has(category)}
                  onChange={() => toggleCategory(category)}
                  className="h-4 w-4"
                />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </fieldset>

        {runsDraft.value.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Choose a scenario above and select &ldquo;Run simulation.&rdquo;
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Category-count table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Scenario</th>
                  {SYSCALL_CATEGORIES.map((c) => (
                    <th key={c} scope="col" className="py-2 pr-4">
                      {CATEGORY_LABELS[c]}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pr-4">Total</th>
                  <th scope="col" className="py-2 pr-4">Exit code</th>
                </tr>
              </thead>
              <tbody>
                {runsDraft.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{SCENARIO_LABELS[run.config.scenarioId as Scenario]}</td>
                    {SYSCALL_CATEGORIES.map((c) => (
                      <td key={c} className="py-2 pr-4">
                        {run.result.metrics[`calls_${c}`]}
                      </td>
                    ))}
                    <td className="py-2 pr-4">{run.result.metrics.totalCalls}</td>
                    <td className="py-2 pr-4">{run.result.metrics.exitCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runsDraft.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Trace for run #{runsDraft.value.length - i}: {SCENARIO_LABELS[run.config.scenarioId as Scenario]}
            </summary>
            {renderTrace(run)}
          </details>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="text-lg font-semibold">
          4. Simulation Evidence Record
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Saved automatically to this browser as you type.
          {evidenceDraft.status === "saved" && evidenceDraft.lastSavedAt && (
            <span className="ml-1 text-slate-500 dark:text-slate-400">
              Last saved {new Date(evidenceDraft.lastSavedAt).toLocaleTimeString()}.
            </span>
          )}
        </p>
        <div className="mt-3">
          <EvidenceRecordForm value={evidenceDraft.value} onChange={evidenceDraft.setValue} />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-lg font-semibold">
          5. Export
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Export the category-count table, annotated trace, and evidence record as JSON, as CSV, or
          a print-ready worksheet.
        </p>
        <div className="mt-3">
          <ExportBar
            moduleId={MODULE_ID}
            moduleTitle={MODULE_TITLE}
            buildPackage={() => ({
              moduleId: MODULE_ID,
              moduleTitle: MODULE_TITLE,
              runs: runsDraft.value,
              evidenceRecord: evidenceDraft.value,
            })}
          />
        </div>
      </section>
    </div>
  );
}
