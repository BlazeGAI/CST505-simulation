"use client";

import { useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import {
  virtualizationIsolationModule,
  BOUNDARY_TYPES,
  BOUNDARY_LABELS,
  RESTRICTION_TYPES,
  RESTRICTION_LABELS,
  ASSESSED_SEED,
  type BoundaryType,
  type RestrictionType,
  type VirtualizationIsolationParams,
} from "@/lib/sim/virtualization-isolation";
import { analyzeVirtualizability, POPEK_GOLDBERG_INSTRUCTIONS } from "@/lib/sim/popek-goldberg-example";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";
import { CourseEvidenceContext } from "@/components/modules/course-evidence-context";

const MODULE_ID = "virtualization-isolation";
const MODULE_TITLE = "Virtualization and Isolation Investigation";
const MAX_RUNS = 8;

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

function runBoundary(params: VirtualizationIsolationParams): StoredRun {
  const result = runSimulation(virtualizationIsolationModule, params, ASSESSED_SEED);
  const config = createScenarioConfig({
    moduleId: MODULE_ID,
    scenarioId: params.boundary,
    seed: ASSESSED_SEED,
    params,
  });
  return { config, result };
}

export function VirtualizationAndIsolationClient() {
  const [boundary, setBoundary] = useState<BoundaryType>("process");
  const [cpuControlEnabled, setCpuControlEnabled] = useState(false);
  const [memoryControlEnabled, setMemoryControlEnabled] = useState(false);
  const [restriction, setRestriction] = useState<RestrictionType>("none");

  const runsDraft = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "assessed", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: ASSESSED_SEED }),
  );

  const virtualizability = analyzeVirtualizability();

  function handleRun() {
    runsDraft.setValue([
      runBoundary({ boundary, cpuControlEnabled, memoryControlEnabled, restriction }),
      ...runsDraft.value,
    ].slice(0, MAX_RUNS));
  }

  function restoreControlBaseline() {
    setCpuControlEnabled(false);
    setMemoryControlEnabled(false);
    setRestriction("none");
  }

  function boundaryLabel(value: unknown): string {
    if (value === "container-unbounded" || value === "container-limited") return "Container (legacy run)";
    return typeof value === "string" && value in BOUNDARY_LABELS
      ? BOUNDARY_LABELS[value as BoundaryType]
      : "Unknown boundary";
  }

  function renderTrace(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">Per-tick CPU demand and allocation, and the kernel-fault event, for this run</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Time</th>
              <th scope="col" className="py-1 pr-4">Event</th>
              <th scope="col" className="py-1 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr
                key={event.index}
                className={
                  event.meta?.starved || event.meta?.event === "kernel-fault"
                    ? "border-b border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    : "border-b border-slate-100 dark:border-slate-900"
                }
              >
                <td className="py-1 pr-4">{event.index}</td>
                <td className="py-1 pr-4">{event.timestamp}</td>
                <td className="py-1 pr-4">{event.label}</td>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 5 &middot; Activity 5.2 &middot; CLO 4</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Classify instructions against the Popek-Goldberg requirements for a trap-and-emulate
        hypervisor, then compare how a process, a container, and a hardware VM each isolate one
        HarborLink primary tenant from a noisy neighbor sharing the same host.
      </p>
      <CourseEvidenceContext moduleId={MODULE_ID} />

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          1. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write in the evidence record below which boundary you expect to protect
          the primary tenant&apos;s CPU share, and which boundary you expect to survive a
          kernel-level fault in the noisy tenant.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="manual-heading">
        <h2 id="manual-heading" className="text-lg font-semibold">
          2. Manual calculation: Popek-Goldberg virtualizability
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          For each instruction below, decide by hand whether it is <strong>privileged</strong> (traps
          outside kernel mode) and whether it is <strong>sensitive</strong> (its behavior depends on,
          or changes, the machine&apos;s resource or privilege configuration). A trap-and-emulate VMM
          can be built for this instruction set only if every sensitive instruction is also
          privileged. Check your work below.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Instruction classification against the Popek-Goldberg requirements</caption>
            <thead>
              <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                <th scope="col" className="py-2 pr-4">Instruction</th>
                <th scope="col" className="py-2 pr-4">Description</th>
                <th scope="col" className="py-2 pr-4">Privileged?</th>
                <th scope="col" className="py-2 pr-4">Sensitive?</th>
              </tr>
            </thead>
            <tbody>
              {POPEK_GOLDBERG_INSTRUCTIONS.map((instruction) => {
                const isViolator = instruction.sensitive && !instruction.privileged;
                return (
                  <tr
                    key={instruction.mnemonic}
                    className={
                      isViolator
                        ? "border-b border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                        : "border-b border-slate-200 dark:border-slate-800"
                    }
                  >
                    <td className="py-2 pr-4 font-mono">{instruction.mnemonic}</td>
                    <td className="py-2 pr-4">{instruction.description}</td>
                    <td className="py-2 pr-4">{instruction.privileged ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">{instruction.sensitive ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {virtualizability.isStrictlyVirtualizable
            ? "Every sensitive instruction is also privileged, so this instruction set is strictly virtualizable."
            : `${virtualizability.violators.length} instruction(s) (${virtualizability.violators
                .map((v) => v.mnemonic)
                .join(", ")}) are sensitive but NOT privileged, so a pure trap-and-emulate VMM cannot be built for this instruction set — a naive hypervisor would let a guest silently observe or corrupt real machine state instead of trapping to be emulated.`}
        </p>
      </section>

      <section className="mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          3. Configure and run
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{ASSESSED_SEED}</strong> and the shared workload are fixed. First compare the
          process, container, and VM baselines. Then restore the control baseline before testing CPU,
          memory, and any assigned network/storage restriction one at a time.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div>
            <label htmlFor="vi-boundary" className="block text-sm font-medium">
              Isolation boundary
            </label>
            <select
              id="vi-boundary"
              value={boundary}
              onChange={(e) => setBoundary(e.target.value as BoundaryType)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {BOUNDARY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BOUNDARY_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={cpuControlEnabled}
              onChange={(event) => setCpuControlEnabled(event.target.checked)}
            />
            CPU cap (30% noisy-tenant ceiling)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={memoryControlEnabled}
              onChange={(event) => setMemoryControlEnabled(event.target.checked)}
            />
            Memory limit
          </label>
          <div>
            <label htmlFor="vi-restriction" className="block text-sm font-medium">
              Network/storage restriction
            </label>
            <select
              id="vi-restriction"
              value={restriction}
              onChange={(event) => setRestriction(event.target.value as RestrictionType)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {RESTRICTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {RESTRICTION_LABELS[value]}
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
          <button
            type="button"
            onClick={restoreControlBaseline}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Restore control baseline
          </button>
          <button
            type="button"
            onClick={() => {
              restoreControlBaseline();
              setCpuControlEnabled(true);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Apply CPU only
          </button>
          <button
            type="button"
            onClick={() => {
              restoreControlBaseline();
              setMemoryControlEnabled(true);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Apply memory only
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
            No runs yet. Try all three boundaries at baseline, then test the CPU cap, memory limit,
            and an assigned network or storage restriction separately.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Isolation boundary comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Boundary</th>
                  <th scope="col" className="py-2 pr-4">CPU starvation ticks</th>
                  <th scope="col" className="py-2 pr-4">CPU control</th>
                  <th scope="col" className="py-2 pr-4">Memory control</th>
                  <th scope="col" className="py-2 pr-4">Restriction result</th>
                  <th scope="col" className="py-2 pr-4">Kernel fault contained</th>
                  <th scope="col" className="py-2 pr-4">Overhead</th>
                  <th scope="col" className="py-2 pr-4">Boot latency</th>
                </tr>
              </thead>
              <tbody>
                {runsDraft.value.map((run, i) => (
                  <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{boundaryLabel(run.config.params.boundary)}</td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.cpuStarvationTicks} / {run.result.metrics.totalTicks}
                    </td>
                    <td className="py-2 pr-4">{run.result.metrics.cpuControlEnabled ? "On" : "Off"}</td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.memoryControlEnabled ? "On; 0 breaches" : `${run.result.metrics.memoryLimitBreaches ?? "—"} breaches`}
                    </td>
                    <td className="py-2 pr-4">
                      {run.result.metrics.networkPacketsDropped
                        ? `${run.result.metrics.networkPacketsDropped} packets blocked`
                        : run.result.metrics.storageOpsThrottled
                          ? `${run.result.metrics.storageOpsThrottled} I/O ops throttled`
                          : "None"}
                    </td>
                    <td className="py-2 pr-4">{run.result.metrics.faultContained ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">{run.result.metrics.overheadPercent}%</td>
                    <td className="py-2 pr-4">{run.result.metrics.bootLatencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runsDraft.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Trace for run #{runsDraft.value.length - i}:{" "}
              {boundaryLabel(run.config.params.boundary)}
            </summary>
            {renderTrace(run)}
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
          Export the boundary comparison, per-run traces, and evidence record as JSON, as CSV, or a
          print-ready worksheet.
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
