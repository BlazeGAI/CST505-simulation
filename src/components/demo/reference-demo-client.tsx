"use client";

import { useState } from "react";
import {
  referenceDemoModule,
  REFERENCE_DEMO_DEFAULT_PARAMS,
  type ReferenceDemoParams,
} from "@/lib/sim/reference-demo";
import { runSimulation } from "@/lib/sim/engine";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";

const MODULE_ID = "reference-demo";
const MODULE_TITLE = "Foundation Engine Demo";
const DEFAULT_SEED = 42;
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

export function ReferenceDemoClient() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [params, setParams] = useState<ReferenceDemoParams>(REFERENCE_DEMO_DEFAULT_PARAMS);
  const [error, setError] = useState<string | undefined>(undefined);

  const runsDraft = useLocalDraft<StoredRun[]>(
    draftKey(MODULE_ID, "reference-demo", "runs"),
    [],
  );
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "reference-demo", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "reference-demo", seed: DEFAULT_SEED }),
  );

  function handleRun() {
    setError(undefined);
    try {
      const result = runSimulation(referenceDemoModule, params, seed);
      const config = createScenarioConfig({
        moduleId: MODULE_ID,
        scenarioId: result.scenarioId,
        seed,
        params,
      });
      const next = [{ config, result }, ...runsDraft.value].slice(0, MAX_RUNS);
      runsDraft.setValue(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The simulation could not run with these parameters.");
    }
  }

  function handleClearRuns() {
    runsDraft.setValue([]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Foundation Engine Demo</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        This is not one of the six graded modules. It is a small, generic queue simulation used to
        prove out the shared engine, evidence record, local storage, and export pipeline before
        any module ships. Every run below is fully determined by its seed and parameters.
      </p>

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write what you expect in the Simulation Evidence Record&apos;s
          &ldquo;Prediction&rdquo; field below &mdash; for example, what happens to the maximum
          queue depth if you inject a failure partway through a bursty arrival pattern.
        </p>
      </section>

      <section className="print:hidden mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          2. Configure and run
        </h2>
        <form
          className="mt-3 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div>
            <label htmlFor="seed" className="block text-sm font-medium">
              Seed
            </label>
            <input
              id="seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="eventCount" className="block text-sm font-medium">
              Event count (5-40)
            </label>
            <input
              id="eventCount"
              type="number"
              min={5}
              max={40}
              value={params.eventCount}
              onChange={(e) =>
                setParams((p) => ({ ...p, eventCount: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label htmlFor="arrivalPace" className="block text-sm font-medium">
              Arrival pace
            </label>
            <select
              id="arrivalPace"
              value={params.arrivalPace}
              onChange={(e) =>
                setParams((p) => ({ ...p, arrivalPace: e.target.value as "steady" | "bursty" }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="steady">Steady</option>
              <option value="bursty">Bursty</option>
            </select>
          </div>
          <div className="flex items-end">
            <label htmlFor="injectFailure" className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                id="injectFailure"
                type="checkbox"
                checked={params.injectFailure}
                onChange={(e) => setParams((p) => ({ ...p, injectFailure: e.target.checked }))}
                className="h-4 w-4"
              />
              Inject a failure partway through
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              Run simulation
            </button>
            {runsDraft.value.length > 0 && (
              <button
                type="button"
                onClick={handleClearRuns}
                className="ml-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Clear run history
              </button>
            )}
          </div>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="results-heading">
        <h2 id="results-heading" className="text-lg font-semibold">
          3. Compare results
        </h2>
        {runsDraft.value.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Configure a scenario above and select &ldquo;Run simulation.&rdquo;
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Runs are listed newest first. Each row is fully determined by its seed and
                parameters.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Seed</th>
                  <th scope="col" className="py-2 pr-4">Pace</th>
                  <th scope="col" className="py-2 pr-4">Failure?</th>
                  <th scope="col" className="py-2 pr-4">Completed</th>
                  <th scope="col" className="py-2 pr-4">Dropped</th>
                  <th scope="col" className="py-2 pr-4">Max queue</th>
                  <th scope="col" className="py-2 pr-4">Avg wait</th>
                </tr>
              </thead>
              <tbody>
                {runsDraft.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{run.config.seed}</td>
                    <td className="py-2 pr-4">{String(run.config.params.arrivalPace)}</td>
                    <td className="py-2 pr-4">{run.config.params.injectFailure ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">{run.result.metrics.totalCompleted}</td>
                    <td className="py-2 pr-4">{run.result.metrics.totalDropped}</td>
                    <td className="py-2 pr-4">{run.result.metrics.maxQueueDepth}</td>
                    <td className="py-2 pr-4">{run.result.metrics.averageWaitTicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runsDraft.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Trace for run #{runsDraft.value.length - i} (seed {run.config.seed})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <caption className="sr-only">Ordered trace of events for this run</caption>
                <thead>
                  <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                    <th scope="col" className="py-1 pr-4">#</th>
                    <th scope="col" className="py-1 pr-4">Event</th>
                    <th scope="col" className="py-1 pr-4">Detail</th>
                    <th scope="col" className="py-1 pr-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {run.result.trace.map((event) => (
                    <tr key={event.index} className="border-b border-slate-100 dark:border-slate-900">
                      <td className="py-1 pr-4">{event.index}</td>
                      <td className="py-1 pr-4">{event.label}</td>
                      <td className="py-1 pr-4">{event.detail}</td>
                      <td className="py-1 pr-4">{event.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          Export everything above as JSON, as CSV, or open the browser print dialog to save a PDF.
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
