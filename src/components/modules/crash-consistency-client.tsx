"use client";

import { useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import {
  crashConsistencyModule,
  CRASH_POINTS,
  CRASH_POINT_LABELS,
  ASSESSED_SEED as CRASH_SEED,
  CRASH_CONSISTENCY_TOTAL_WRITES,
  deriveStructureState,
  type CrashPoint,
} from "@/lib/sim/crash-consistency";
import {
  ioBenchmarkModule,
  IO_PATTERNS,
  IO_PATTERN_LABELS,
  ASSESSED_SEED as IO_SEED,
  type IoPattern,
} from "@/lib/sim/io-benchmark";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";

const MODULE_ID = "crash-consistency";
const MODULE_TITLE = "Crash Consistency";
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

const STRUCTURE_ROWS: { key: keyof ReturnType<typeof deriveStructureState>; label: string }[] = [
  { key: "inodeBitmapBit", label: "Inode bitmap bit 0" },
  { key: "inodeStruct", label: "Inode 0" },
  { key: "dataBitmapBit", label: "Data bitmap bit 0" },
  { key: "blockContent", label: "Data block 0" },
  { key: "directoryEntry", label: 'Directory entry "alert.log"' },
];

function formatStructureValue(value: unknown): string {
  if (value === null || value === false) return "-";
  if (value === true) return "set";
  if (typeof value === "object" && value !== null && "size" in value) {
    const v = value as { size: number; blocks: number[] };
    return `size ${v.size}, blocks [${v.blocks.join(", ")}]`;
  }
  return String(value);
}

function runCrashScenario(crashPoint: CrashPoint): StoredRun {
  const result = runSimulation(crashConsistencyModule, { crashPoint }, CRASH_SEED);
  const config = createScenarioConfig({
    moduleId: "crash-consistency-fs",
    scenarioId: crashPoint,
    seed: CRASH_SEED,
    params: { crashPoint },
  });
  return { config, result };
}

function runIoScenario(pattern: IoPattern): StoredRun {
  const result = runSimulation(ioBenchmarkModule, { pattern }, IO_SEED);
  const config = createScenarioConfig({
    moduleId: "io-benchmark",
    scenarioId: pattern,
    seed: IO_SEED,
    params: { pattern },
  });
  return { config, result };
}

export function CrashConsistencyClient() {
  const [crashPoint, setCrashPoint] = useState<CrashPoint>("none");
  const [ioPattern, setIoPattern] = useState<IoPattern>("sync-small");

  const crashRuns = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "crash-consistency-fs", "runs"), []);
  const ioRuns = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "io-benchmark", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: CRASH_SEED }),
  );

  function handleRunCrash() {
    crashRuns.setValue([runCrashScenario(crashPoint), ...crashRuns.value].slice(0, MAX_RUNS));
  }
  function handleRunIo() {
    ioRuns.setValue([runIoScenario(ioPattern), ...ioRuns.value].slice(0, MAX_RUNS));
  }

  function renderWorksheet(run: StoredRun) {
    const writesDurable = run.result.metrics.writesDurableBeforeCrash;
    const intended = deriveStructureState(CRASH_CONSISTENCY_TOTAL_WRITES);
    const durable = deriveStructureState(writesDurable);
    return (
      <>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <caption className="mb-1 text-left text-xs text-slate-500 dark:text-slate-400">
              Annotated on-disk state: intended (all six writes) vs. durable at this crash point.
            </caption>
            <thead>
              <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                <th scope="col" className="py-1 pr-4">Structure</th>
                <th scope="col" className="py-1 pr-4">Intended</th>
                <th scope="col" className="py-1 pr-4">Durable at crash</th>
              </tr>
            </thead>
            <tbody>
              {STRUCTURE_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-1 pr-4">{row.label}</td>
                  <td className="py-1 pr-4 font-mono text-xs">{formatStructureValue(intended[row.key])}</td>
                  <td className="py-1 pr-4 font-mono text-xs">{formatStructureValue(durable[row.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="mb-1 text-left text-xs text-slate-500 dark:text-slate-400">
              State-transition worksheet: the ordered write sequence, and fsck&apos;s findings and
              recovery actions.
            </caption>
            <thead>
              <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                <th scope="col" className="py-1 pr-4">#</th>
                <th scope="col" className="py-1 pr-4">Step</th>
                <th scope="col" className="py-1 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody>
              {run.result.trace.map((event) => (
                <tr
                  key={event.index}
                  className={
                    event.meta?.step === "fsck"
                      ? "border-b border-indigo-100 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/20"
                      : event.meta?.applied === false
                        ? "border-b border-red-100 bg-red-50/60 text-slate-400 dark:border-red-900 dark:bg-red-950/20 dark:text-slate-500"
                        : "border-b border-slate-100 dark:border-slate-900"
                  }
                >
                  <td className="py-1 pr-4">{event.index}</td>
                  <td className="py-1 pr-4">{event.label}</td>
                  <td className="py-1 pr-4">{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderIoTrace(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">Sample per-operation latencies for this run</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr key={event.index} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">{event.index}</td>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 4 &middot; CLO 3</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        A minimal on-disk file system executes a fixed, ordered create-and-append sequence for a
        HarborLink alert log. Interrupting that sequence at different points produces different,
        specific inconsistencies &mdash; not a single generic &ldquo;crash.&rdquo; A simplified fsck
        pass then reports what it could repair, what it lost, and what it could only leave
        ambiguous.
      </p>

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write in the evidence record below which of the three assigned crash
          points (after W3, W4, or W5) you expect to lose data outright, and which you expect
          recovery to fully preserve.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="structures-heading">
        <h2 id="structures-heading" className="text-lg font-semibold">
          2. On-disk structures
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <caption className="sr-only">The five on-disk structures this file system uses</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                <th scope="col" className="py-1 pr-4">Structure</th>
                <th scope="col" className="py-1 pr-4">Role</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">Inode bitmap</td>
                <td className="py-1 pr-4">One bit per inode: is it allocated?</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">Data bitmap</td>
                <td className="py-1 pr-4">One bit per data block: is it allocated?</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">Inode table</td>
                <td className="py-1 pr-4">Per file: size and data block pointers.</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">Directory</td>
                <td className="py-1 pr-4">Maps a file name to an inode number.</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-1 pr-4">Data blocks</td>
                <td className="py-1 pr-4">The file&apos;s actual bytes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          3. Configure and run: crash point
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{CRASH_SEED}</strong> and the write sequence are fixed. Run the three
          assigned points (after W3, W4, and W5) plus &ldquo;no crash&rdquo; for comparison.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunCrash();
          }}
        >
          <div>
            <label htmlFor="crash-point" className="block text-sm font-medium">
              Crash point
            </label>
            <select
              id="crash-point"
              value={crashPoint}
              onChange={(e) => setCrashPoint(e.target.value as CrashPoint)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {CRASH_POINTS.map((p) => (
                <option key={p} value={p}>
                  {CRASH_POINT_LABELS[p]}
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
          {crashRuns.value.length > 0 && (
            <button
              type="button"
              onClick={() => crashRuns.setValue([])}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear run history
            </button>
          )}
        </form>

        {crashRuns.value.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No runs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Inconsistency and recovery comparison. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Crash point</th>
                  <th scope="col" className="py-2 pr-4">Findings</th>
                  <th scope="col" className="py-2 pr-4">Repaired</th>
                  <th scope="col" className="py-2 pr-4">Lost</th>
                  <th scope="col" className="py-2 pr-4">Ambiguous</th>
                  <th scope="col" className="py-2 pr-4">Reachable after</th>
                </tr>
              </thead>
              <tbody>
                {crashRuns.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{CRASH_POINT_LABELS[run.config.scenarioId as CrashPoint]}</td>
                    <td className="py-2 pr-4">{run.result.metrics.findingsCount}</td>
                    <td className="py-2 pr-4">{run.result.metrics.repairedCount}</td>
                    <td className="py-2 pr-4">{run.result.metrics.lostCount}</td>
                    <td className="py-2 pr-4">{run.result.metrics.ambiguousCount}</td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.lostCount > 0
                        ? "Data lost"
                        : run.result.metrics.fileReachableAfterRecovery
                          ? "By its name"
                          : run.result.metrics.fileReachableViaLostFound
                            ? "Via lost+found"
                            : "Not reachable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {crashRuns.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Worksheet for run #{crashRuns.value.length - i}:{" "}
              {CRASH_POINT_LABELS[run.config.scenarioId as CrashPoint]}
            </summary>
            {renderWorksheet(run)}
          </details>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="io-heading">
        <h2 id="io-heading" className="text-lg font-semibold">
          4. Configure and run: I/O pattern
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{IO_SEED}</strong>. Test parameters (block size, operation count, queue
          depth, fsync policy) are fixed per pattern and reported alongside the measured numbers.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRunIo();
          }}
        >
          <div>
            <label htmlFor="io-pattern" className="block text-sm font-medium">
              Write pattern
            </label>
            <select
              id="io-pattern"
              value={ioPattern}
              onChange={(e) => setIoPattern(e.target.value as IoPattern)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {IO_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {IO_PATTERN_LABELS[p]}
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
          {ioRuns.value.length > 0 && (
            <button
              type="button"
              onClick={() => ioRuns.setValue([])}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear run history
            </button>
          )}
        </form>

        {ioRuns.value.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No runs yet. Run both patterns to compare.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                I/O comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Pattern</th>
                  <th scope="col" className="py-2 pr-4">Block size</th>
                  <th scope="col" className="py-2 pr-4">IOPS</th>
                  <th scope="col" className="py-2 pr-4">Bandwidth</th>
                  <th scope="col" className="py-2 pr-4">Mean latency</th>
                  <th scope="col" className="py-2 pr-4">p95 latency</th>
                  <th scope="col" className="py-2 pr-4">At-risk bytes</th>
                </tr>
              </thead>
              <tbody>
                {ioRuns.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{IO_PATTERN_LABELS[run.config.scenarioId as IoPattern]}</td>
                    <td className="py-2 pr-4">{run.result.metrics.blockSizeKB} KB</td>
                    <td className="py-2 pr-4">{run.result.metrics.iops}</td>
                    <td className="py-2 pr-4">{run.result.metrics.bandwidthMBps} MB/s</td>
                    <td className="py-2 pr-4">{run.result.metrics.meanLatencyMs} ms</td>
                    <td className="py-2 pr-4">{run.result.metrics.p95LatencyMs} ms</td>
                    <td className="py-2 pr-4">{(run.result.metrics.atRiskBytes / 1024).toLocaleString()} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ioRuns.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Sample operations for run #{ioRuns.value.length - i}:{" "}
              {IO_PATTERN_LABELS[run.config.scenarioId as IoPattern]}
            </summary>
            {renderIoTrace(run)}
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
          Export the state-transition worksheet, inconsistency/recovery table, I/O comparison, and
          evidence record together as JSON, as CSV, or a print-ready worksheet.
        </p>
        <div className="mt-3">
          <ExportBar
            moduleId={MODULE_ID}
            moduleTitle={MODULE_TITLE}
            buildPackage={() => ({
              moduleId: MODULE_ID,
              moduleTitle: MODULE_TITLE,
              runs: [...crashRuns.value, ...ioRuns.value],
              evidenceRecord: evidenceDraft.value,
            })}
          />
        </div>
      </section>
    </div>
  );
}
