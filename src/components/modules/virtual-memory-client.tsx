"use client";

import { useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import { virtualMemoryModule, POLICIES, ASSESSED_SEED, type Policy } from "@/lib/sim/virtual-memory";
import { BELADY_REFERENCE_STRING, computeBeladyComparisons } from "@/lib/sim/belady-example";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";

const MODULE_ID = "virtual-memory";
const MODULE_TITLE = "Virtual Memory";
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

const POLICY_LABELS: Record<Policy, string> = {
  fifo: "FIFO",
  lru: "LRU",
  clock: "Clock (second chance)",
};

function runPolicy(policy: Policy, frames: number, isolateAnalytics: boolean): StoredRun {
  const result = runSimulation(virtualMemoryModule, { policy, frames, isolateAnalytics }, ASSESSED_SEED);
  const config = createScenarioConfig({
    moduleId: MODULE_ID,
    scenarioId: `${policy}-${frames}f${isolateAnalytics ? "-isolated" : ""}`,
    seed: ASSESSED_SEED,
    params: { policy, frames, isolateAnalytics },
  });
  return { config, result };
}

export function VirtualMemoryClient() {
  const [policy, setPolicy] = useState<Policy>("fifo");
  const [frames, setFrames] = useState(4);
  const [isolateAnalytics, setIsolateAnalytics] = useState(false);

  const runsDraft = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "assessed", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: ASSESSED_SEED }),
  );

  const beladyComparisons = computeBeladyComparisons();

  function handleRun() {
    runsDraft.setValue([runPolicy(policy, frames, isolateAnalytics), ...runsDraft.value].slice(0, MAX_RUNS));
  }

  function renderReferenceTrace(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Ordered reference string, hits/faults, and evictions for this run</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Phase</th>
              <th scope="col" className="py-1 pr-4">Page</th>
              <th scope="col" className="py-1 pr-4">Result</th>
              <th scope="col" className="py-1 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr
                key={event.index}
                className={
                  event.meta?.isHit
                    ? "border-b border-slate-100 dark:border-slate-900"
                    : "border-b border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                }
              >
                <td className="py-1 pr-4">{event.index}</td>
                <td className="py-1 pr-4">{String(event.meta?.phase ?? "")}</td>
                <td className="py-1 pr-4">{String(event.meta?.page ?? "")}</td>
                <td className="py-1 pr-4">{event.meta?.isHit ? "Hit" : "Fault"}</td>
                <td className="py-1 pr-4">{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 3 &middot; CLO 2</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        A seeded reference string sweeps through four labeled HarborLink workload phases with
        different locality, then a fifth phase resumes ingestion so a memory control&apos;s payoff is
        actually observable. FIFO, LRU, and Clock compete for a small, adjustable number of physical
        frames.
      </p>

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write in the evidence record below which policy you expect to fault least
          at 4 frames, and whether adding frames can ever make a policy fault more (see the manual
          calculation below).
        </p>
      </section>

      <section className="mt-8" aria-labelledby="manual-heading">
        <h2 id="manual-heading" className="text-lg font-semibold">
          2. Manual calculation: Belady&apos;s anomaly
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Before using the simulator, calculate FIFO and optimal (Belady&apos;s OPT) replacement by
          hand for the fixed reference string{" "}
          <span className="font-mono">{BELADY_REFERENCE_STRING.join(", ")}</span> at 3 and 4 frames.
          Optimal always evicts the resident page used furthest in the future &mdash; which requires
          knowing the future reference sequence, so no real operating system can run it online; it
          exists only as a theoretical bound to compare other policies against. Check your work
          below.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">FIFO versus optimal fault counts at 3 and 4 frames</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                <th scope="col" className="py-2 pr-4">Frames</th>
                <th scope="col" className="py-2 pr-4">FIFO faults</th>
                <th scope="col" className="py-2 pr-4">Optimal faults</th>
              </tr>
            </thead>
            <tbody>
              {beladyComparisons.map((c) => (
                <tr key={c.frameCount} className="border-b border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{c.frameCount}</td>
                  <td className="py-2 pr-4">{c.fifoFaults}</td>
                  <td className="py-2 pr-4">{c.optimalFaults}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          FIFO faults <strong>more</strong> at 4 frames than at 3 &mdash; more memory made FIFO
          worse. Optimal never gets worse with more frames, which is exactly why it is the
          theoretical bound the anomaly is measured against.
        </p>
      </section>

      <section className="print:hidden mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          3. Configure and run
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{ASSESSED_SEED}</strong> and the workload are fixed &mdash; only the policy,
          frame count, and control change between runs.
        </p>
        <form
          className="mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div>
            <label htmlFor="vm-policy" className="block text-sm font-medium">
              Policy
            </label>
            <select
              id="vm-policy"
              value={policy}
              onChange={(e) => setPolicy(e.target.value as Policy)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {POLICIES.map((p) => (
                <option key={p} value={p}>
                  {POLICY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vm-frames" className="block text-sm font-medium">
              Frames (2-8)
            </label>
            <input
              id="vm-frames"
              type="number"
              min={2}
              max={8}
              value={frames}
              onChange={(e) => setFrames(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="flex items-end">
            <label htmlFor="vm-isolate" className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                id="vm-isolate"
                type="checkbox"
                checked={isolateAnalytics}
                onChange={(e) => setIsolateAnalytics(e.target.checked)}
                className="h-4 w-4"
              />
              Isolate the analytics phase (memory control)
            </label>
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

      <section className="mt-8" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-lg font-semibold">
          4. Compare results
        </h2>
        {runsDraft.value.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Try FIFO, LRU, and Clock at 4 frames, then vary the frame count.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Policy comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Policy</th>
                  <th scope="col" className="py-2 pr-4">Frames</th>
                  <th scope="col" className="py-2 pr-4">Control</th>
                  <th scope="col" className="py-2 pr-4">Hit rate</th>
                  <th scope="col" className="py-2 pr-4">Faults</th>
                  <th scope="col" className="py-2 pr-4">Write-backs</th>
                  <th scope="col" className="py-2 pr-4">Working set</th>
                  <th scope="col" className="py-2 pr-4">Thrashing at</th>
                  <th scope="col" className="py-2 pr-4">Recovery hits</th>
                </tr>
              </thead>
              <tbody>
                {runsDraft.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{POLICY_LABELS[run.config.params.policy as Policy]}</td>
                    <td className="py-2 pr-4">{String(run.config.params.frames)}</td>
                    <td className="py-2 pr-4">{run.config.params.isolateAnalytics ? "On" : "Off"}</td>
                    <td className="py-2 pr-4">{run.result.metrics.hitRate}</td>
                    <td className="py-2 pr-4">{run.result.metrics.faults}</td>
                    <td className="py-2 pr-4">{run.result.metrics.writeBacks}</td>
                    <td className="py-2 pr-4">{run.result.metrics.workingSetEstimate}</td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.thrashingDetectedAtIndex >= 0
                        ? `#${run.result.metrics.thrashingDetectedAtIndex} (${Math.round(
                            run.result.metrics.thrashingWindowFaultRate * 100,
                          )}% window fault rate)`
                        : "not detected"}
                    </td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.recoveryHits} / {run.result.metrics.recoveryHits + run.result.metrics.recoveryFaults}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runsDraft.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Reference-string trace for run #{runsDraft.value.length - i}:{" "}
              {POLICY_LABELS[run.config.params.policy as Policy]} at {String(run.config.params.frames)} frames
              {run.config.params.isolateAnalytics ? " (isolated)" : ""}
            </summary>
            {renderReferenceTrace(run)}
          </details>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="text-lg font-semibold">
          5. Simulation Evidence Record
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
          6. Export
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Export the policy comparison, reference-string traces, and evidence record as JSON, as
          CSV, or a print-ready worksheet.
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
