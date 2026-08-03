"use client";

import { useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import {
  schedulingPolicyModule,
  POLICIES,
  ASSESSED_SEED as SCHEDULING_SEED,
  type Policy,
} from "@/lib/sim/scheduling-policy";
import {
  ringBufferModule,
  RING_BUFFER_MODES,
  ASSESSED_SEED as RING_BUFFER_SEED,
  type RingBufferMode,
} from "@/lib/sim/ring-buffer";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";

const MODULE_ID = "scheduling-and-concurrency";
const MODULE_TITLE = "Scheduling and Concurrency";
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

const POLICY_LABELS: Record<Policy, string> = {
  fifo: "FIFO",
  "round-robin": "Round robin",
  "fair-share": "Fair-share (priority)",
};

const RING_BUFFER_MODE_LABELS: Record<RingBufferMode, string> = {
  unsafe: "Unsafe (no synchronization)",
  mutex: "Mutex-corrected",
};

function runPolicy(policy: Policy, timeQuantum: number): StoredRun {
  const result = runSimulation(schedulingPolicyModule, { policy, timeQuantum }, SCHEDULING_SEED);
  const config = createScenarioConfig({
    moduleId: "scheduling-policy",
    scenarioId: policy,
    seed: SCHEDULING_SEED,
    params: { policy, timeQuantum },
  });
  return { config, result };
}

function runRingBufferMode(mode: RingBufferMode): StoredRun {
  const result = runSimulation(ringBufferModule, { mode }, RING_BUFFER_SEED);
  const config = createScenarioConfig({
    moduleId: "ring-buffer",
    scenarioId: mode,
    seed: RING_BUFFER_SEED,
    params: { mode },
  });
  return { config, result };
}

export function SchedulingAndConcurrencyClient() {
  const [policy, setPolicy] = useState<Policy>("fifo");
  const [timeQuantum, setTimeQuantum] = useState(4);
  const [ringBufferMode, setRingBufferMode] = useState<RingBufferMode>("unsafe");

  const scheduleRuns = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "scheduling-policy", "runs"), []);
  const ringBufferRuns = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "ring-buffer", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: SCHEDULING_SEED }),
  );

  function handleRunPolicy() {
    scheduleRuns.setValue([runPolicy(policy, timeQuantum), ...scheduleRuns.value].slice(0, MAX_RUNS));
  }

  function handleRunRingBuffer() {
    ringBufferRuns.setValue([runRingBufferMode(ringBufferMode), ...ringBufferRuns.value].slice(0, MAX_RUNS));
  }

  function renderQueueLog(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">
            Queue-state log (text equivalent of the scheduling timeline) for this run
          </caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Time</th>
              <th scope="col" className="py-1 pr-4">Class</th>
              <th scope="col" className="py-1 pr-4">Event</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr
                key={event.index}
                className={
                  event.meta?.event === "deadline-missed"
                    ? "border-b border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    : "border-b border-slate-100 dark:border-slate-900"
                }
              >
                <td className="py-1 pr-4">{event.index}</td>
                <td className="py-1 pr-4">{event.timestamp}</td>
                <td className="py-1 pr-4">{String(event.meta?.classId ?? "")}</td>
                <td className="py-1 pr-4">{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderRingBufferTrace(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <caption className="sr-only">Ordered thread interleaving for this run</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Time</th>
              <th scope="col" className="py-1 pr-4">Thread</th>
              <th scope="col" className="py-1 pr-4">Operation</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr key={event.index} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">{event.index}</td>
                <td className="py-1 pr-4">{event.timestamp}</td>
                <td className="py-1 pr-4">{String(event.meta?.thread ?? "")}</td>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 2 &middot; CLO 1</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Two related, deterministic simulations: a scheduling-policy comparison across five
        HarborLink workload classes, and a controlled shared-buffer interleaving that shows a
        correct scheduling policy can still produce an incorrect result when synchronization fails.
      </p>

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write in the evidence record below which policy you expect to protect the
          safety-alert deadline, and whether you expect the unsynchronized ring buffer to lose an
          update.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="scheduling-heading">
        <h2 id="scheduling-heading" className="text-lg font-semibold">
          2. Scheduling policy comparison
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{SCHEDULING_SEED}</strong> and the workload are fixed &mdash; only the policy
          and time quantum change between runs.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunPolicy();
          }}
        >
          <div>
            <label htmlFor="policy" className="block text-sm font-medium">
              Policy
            </label>
            <select
              id="policy"
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
            <label htmlFor="timeQuantum" className="block text-sm font-medium">
              Time quantum (round robin / fair-share)
            </label>
            <input
              id="timeQuantum"
              type="number"
              min={2}
              max={6}
              value={timeQuantum}
              onChange={(e) => setTimeQuantum(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Run simulation
          </button>
          {scheduleRuns.value.length > 0 && (
            <button
              type="button"
              onClick={() => scheduleRuns.setValue([])}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear run history
            </button>
          )}
        </form>

        {scheduleRuns.value.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Try FIFO, round robin, and fair-share with the same quantum to compare.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Policy comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Policy</th>
                  <th scope="col" className="py-2 pr-4">Avg response</th>
                  <th scope="col" className="py-2 pr-4">Avg waiting</th>
                  <th scope="col" className="py-2 pr-4">Avg turnaround</th>
                  <th scope="col" className="py-2 pr-4">CPU util.</th>
                  <th scope="col" className="py-2 pr-4">Fairness</th>
                  <th scope="col" className="py-2 pr-4">Deadlines missed</th>
                </tr>
              </thead>
              <tbody>
                {scheduleRuns.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{POLICY_LABELS[run.config.scenarioId as Policy]}</td>
                    <td className="py-2 pr-4">{run.result.metrics.avgResponseTime}</td>
                    <td className="py-2 pr-4">{run.result.metrics.avgWaitingTime}</td>
                    <td className="py-2 pr-4">{run.result.metrics.avgTurnaroundTime}</td>
                    <td className="py-2 pr-4">{run.result.metrics.cpuUtilization}</td>
                    <td className="py-2 pr-4">{run.result.metrics.fairnessIndex}</td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.deadlineMisses} / {run.result.metrics.deadlineJobs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {scheduleRuns.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Queue-state log for run #{scheduleRuns.value.length - i}:{" "}
              {POLICY_LABELS[run.config.scenarioId as Policy]}
            </summary>
            {renderQueueLog(run)}
          </details>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="ring-buffer-heading">
        <h2 id="ring-buffer-heading" className="text-lg font-semibold">
          3. Shared ring-buffer interleaving
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{RING_BUFFER_SEED}</strong>. The safety-alert thread (A) and the
          sensor-ingestion thread (B) both append to one shared buffer using the same fixed,
          controlled interleaving &mdash; only the synchronization mechanism changes.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunRingBuffer();
          }}
        >
          <div>
            <label htmlFor="ringBufferMode" className="block text-sm font-medium">
              Synchronization
            </label>
            <select
              id="ringBufferMode"
              value={ringBufferMode}
              onChange={(e) => setRingBufferMode(e.target.value as RingBufferMode)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {RING_BUFFER_MODES.map((m) => (
                <option key={m} value={m}>
                  {RING_BUFFER_MODE_LABELS[m]}
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
          {ringBufferRuns.value.length > 0 && (
            <button
              type="button"
              onClick={() => ringBufferRuns.setValue([])}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear run history
            </button>
          )}
        </form>

        {ringBufferRuns.value.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Run &ldquo;Unsafe&rdquo; then &ldquo;Mutex-corrected&rdquo; to compare.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Ring-buffer comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Mode</th>
                  <th scope="col" className="py-2 pr-4">Entries persisted</th>
                  <th scope="col" className="py-2 pr-4">Final tail</th>
                  <th scope="col" className="py-2 pr-4">Correct?</th>
                  <th scope="col" className="py-2 pr-4">Lock-wait ticks</th>
                </tr>
              </thead>
              <tbody>
                {ringBufferRuns.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">
                      {RING_BUFFER_MODE_LABELS[run.config.scenarioId as RingBufferMode]}
                    </td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.entriesPersisted} / {run.result.metrics.entriesAttempted}
                    </td>
                    <td className="py-2 pr-4">{run.result.metrics.finalTail}</td>
                    <td className="py-2 pr-4">{run.result.metrics.correct ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">{run.result.metrics.lockWaitTicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ringBufferRuns.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Interleaving for run #{ringBufferRuns.value.length - i}:{" "}
              {RING_BUFFER_MODE_LABELS[run.config.scenarioId as RingBufferMode]}
            </summary>
            {renderRingBufferTrace(run)}
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
          Export the policy comparison, ring-buffer results, and evidence record together as JSON,
          as CSV, or a print-ready worksheet.
        </p>
        <div className="mt-3">
          <ExportBar
            moduleId={MODULE_ID}
            moduleTitle={MODULE_TITLE}
            buildPackage={() => ({
              moduleId: MODULE_ID,
              moduleTitle: MODULE_TITLE,
              runs: [...scheduleRuns.value, ...ringBufferRuns.value],
              evidenceRecord: evidenceDraft.value,
            })}
          />
        </div>
      </section>
    </div>
  );
}
