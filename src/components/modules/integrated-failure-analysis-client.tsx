"use client";

import { useState } from "react";
import { runSimulation } from "@/lib/sim/engine";
import {
  integratedFailureAnalysisModule,
  STAGE_IDS,
  STAGE_LABELS,
  ASSESSED_SEED,
  INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS,
  FULLY_MITIGATED_PARAMS,
  type IntegratedFailureAnalysisParams,
  type StageId,
} from "@/lib/sim/integrated-failure-analysis";
import { POLICIES as SCHEDULING_POLICIES, type Policy as SchedulingPolicy } from "@/lib/sim/scheduling-policy";
import { IO_PATTERNS, IO_PATTERN_LABELS, type IoPattern } from "@/lib/sim/io-benchmark";
import { BOUNDARY_TYPES, BOUNDARY_LABELS, type BoundaryType } from "@/lib/sim/virtualization-isolation";
import { createScenarioConfig, type ScenarioConfig } from "@/lib/schemas/scenario-config";
import type { RunResult } from "@/lib/schemas/run-result";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { useLocalDraft } from "@/lib/storage/use-local-draft";
import { draftKey } from "@/lib/storage/local-draft-store";
import { EvidenceRecordForm } from "@/components/evidence/evidence-record-form";
import { ExportBar } from "@/components/evidence/export-bar";
import { CourseEvidenceContext } from "@/components/modules/course-evidence-context";
import {
  MAX_EVIDENCE_FILE_BYTES,
  parseIntegratedEvidencePackage,
} from "@/lib/import/integrated-evidence";

const MODULE_ID = "integrated-failure-analysis";
const MODULE_TITLE = "Integrated Failure Investigation";
const MAX_RUNS = 8;

const SCHEDULING_POLICY_LABELS: Record<SchedulingPolicy, string> = {
  fifo: "FIFO",
  "sjf-stcf": "SJF/STCF",
  "round-robin": "Round robin",
  "fair-share": "Fair-share",
};

interface StoredRun {
  config: ScenarioConfig;
  result: RunResult;
}

function runIncident(params: IntegratedFailureAnalysisParams): StoredRun {
  const result = runSimulation(integratedFailureAnalysisModule, params, ASSESSED_SEED);
  const config = createScenarioConfig({
    moduleId: MODULE_ID,
    scenarioId: `${params.schedulingPolicy}-${params.memoryControlEnabled ? "mem-on" : "mem-off"}-${params.durabilityPolicy}-${params.isolationBoundary}`,
    seed: ASSESSED_SEED,
    params,
  });
  return { config, result };
}

export function IntegratedFailureAnalysisClient() {
  const [schedulingPolicy, setSchedulingPolicy] = useState<SchedulingPolicy>(
    INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS.schedulingPolicy,
  );
  const [memoryControlEnabled, setMemoryControlEnabled] = useState(
    INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS.memoryControlEnabled,
  );
  const [durabilityPolicy, setDurabilityPolicy] = useState<IoPattern>(
    INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS.durabilityPolicy,
  );
  const [isolationBoundary, setIsolationBoundary] = useState<BoundaryType>(
    INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS.isolationBoundary,
  );
  const [importStatus, setImportStatus] = useState<{ kind: "success" | "error"; message: string }>();

  const runsDraft = useLocalDraft<StoredRun[]>(draftKey(MODULE_ID, "assessed", "runs"), []);
  const evidenceDraft = useLocalDraft(
    draftKey(MODULE_ID, "assessed", "evidence"),
    createEmptyEvidenceRecord({ moduleId: MODULE_ID, scenarioId: "assessed", seed: ASSESSED_SEED }),
  );

  function handleRun() {
    const params: IntegratedFailureAnalysisParams = {
      schedulingPolicy,
      memoryControlEnabled,
      durabilityPolicy,
      isolationBoundary,
    };
    runsDraft.setValue([runIncident(params), ...runsDraft.value].slice(0, MAX_RUNS));
  }

  function applyMitigated() {
    setSchedulingPolicy(FULLY_MITIGATED_PARAMS.schedulingPolicy);
    setMemoryControlEnabled(FULLY_MITIGATED_PARAMS.memoryControlEnabled);
    setDurabilityPolicy(FULLY_MITIGATED_PARAMS.durabilityPolicy);
    setIsolationBoundary(FULLY_MITIGATED_PARAMS.isolationBoundary);
  }

  async function handleEvidenceImport(files: FileList | null) {
    if (!files?.length) return;
    const next: IntegratedFailureAnalysisParams = {
      schedulingPolicy,
      memoryControlEnabled,
      durabilityPolicy,
      isolationBoundary,
    };
    const importedModules: string[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_EVIDENCE_FILE_BYTES) {
        errors.push(`${file.name}: file exceeds the 2 MB limit.`);
        continue;
      }
      try {
        const imported = parseIntegratedEvidencePackage(await file.text());
        Object.assign(next, imported.selection);
        importedModules.push(imported.moduleId);
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "Import failed."}`);
      }
    }

    if (importedModules.length) {
      setSchedulingPolicy(next.schedulingPolicy);
      setMemoryControlEnabled(next.memoryControlEnabled);
      setDurabilityPolicy(next.durabilityPolicy);
      setIsolationBoundary(next.isolationBoundary);
    }
    setImportStatus(
      errors.length
        ? { kind: "error", message: `${importedModules.length} package(s) loaded. ${errors.join(" ")}` }
        : { kind: "success", message: `Loaded ${importedModules.length} package(s) from Simulations 2-5.` },
    );
  }

  function stageLabel(stageId: StageId) {
    return STAGE_LABELS[stageId].split(":")[0];
  }

  function renderTimeline(run: StoredRun) {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">The four-stage compound-incident timeline for this run</caption>
          <thead>
            <tr className="border-b border-slate-300 text-left dark:border-slate-700">
              <th scope="col" className="py-1 pr-4">#</th>
              <th scope="col" className="py-1 pr-4">Time</th>
              <th scope="col" className="py-1 pr-4">Stage</th>
              <th scope="col" className="py-1 pr-4">Outcome</th>
              <th scope="col" className="py-1 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody>
            {run.result.trace.map((event) => (
              <tr
                key={event.index}
                className={
                  event.meta?.constraintHeld === false
                    ? "border-b border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    : event.meta?.reached === false
                      ? "border-b border-slate-100 text-slate-400 dark:border-slate-900 dark:text-slate-500"
                      : "border-b border-slate-100 dark:border-slate-900"
                }
              >
                <td className="py-1 pr-4">{event.index}</td>
                <td className="py-1 pr-4">{event.timestamp}</td>
                <td className="py-1 pr-4">{stageLabel(event.meta?.stageId as StageId)}</td>
                <td className="py-1 pr-4">
                  {event.meta?.reached === false
                    ? "Never reached"
                    : event.meta?.constraintHeld
                      ? "Held"
                      : "Failed"}
                </td>
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
      <p className="text-sm text-slate-500 dark:text-slate-400">Week 6 &middot; Activity 6.2 &middot; CLO 1, CLO 2, CLO 3, CLO 4</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{MODULE_TITLE}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        One compound incident hits four HarborLink subsystems in a fixed order &mdash; scheduling,
        memory, durability, and isolation &mdash; each governed by the same policy you chose in
        Weeks 2 through 5. Find the first failed constraint, then fix it one subsystem at a time.
      </p>
      <CourseEvidenceContext moduleId={MODULE_ID} />

      <section className="mt-8" aria-labelledby="import-heading">
        <h2 id="import-heading" className="text-lg font-semibold">1. Import prior evidence</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Select valid JSON evidence packages exported from Simulations 2-5. The app validates the
          schema and loads the latest supported scheduling, memory-control, durability, and
          isolation selections. If earlier exports are unavailable, keep the instructor default
          configuration shown below.
        </p>
        <label htmlFor="ifa-import" className="mt-3 block text-sm font-medium">
          JSON evidence packages from Simulations 2-5
        </label>
        <input
          id="ifa-import"
          type="file"
          accept="application/json,.json"
          multiple
          onChange={(event) => {
            void handleEvidenceImport(event.target.files);
            event.target.value = "";
          }}
          className="print:hidden mt-1 block w-full max-w-xl rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {importStatus && (
          <p
            className={`mt-2 text-sm ${importStatus.kind === "error" ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}
            role="status"
          >
            {importStatus.message}
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="predict-heading">
        <h2 id="predict-heading" className="text-lg font-semibold">
          2. Predict
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Before running, write in the evidence record below which of the four subsystems you
          expect to fail first under the weakest policy at every stage, and how many stages you
          expect a fully mitigated configuration to hold.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="configure-heading">
        <h2 id="configure-heading" className="text-lg font-semibold">
          3. Configure and run
        </h2>
        <p className="print:hidden mt-1 text-sm text-slate-600 dark:text-slate-300">
          Seed <strong>{ASSESSED_SEED}</strong> and the incident load at each stage are fixed
          &mdash; only the four subsystem policies change between runs.
        </p>
        <form
          className="print:hidden mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div>
            <label htmlFor="ifa-scheduling" className="block text-sm font-medium">
              Scheduling policy
            </label>
            <select
              id="ifa-scheduling"
              value={schedulingPolicy}
              onChange={(e) => setSchedulingPolicy(e.target.value as SchedulingPolicy)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {SCHEDULING_POLICIES.map((p) => (
                <option key={p} value={p}>
                  {SCHEDULING_POLICY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ifa-durability" className="block text-sm font-medium">
              Durability policy
            </label>
            <select
              id="ifa-durability"
              value={durabilityPolicy}
              onChange={(e) => setDurabilityPolicy(e.target.value as IoPattern)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {IO_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {IO_PATTERN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ifa-boundary" className="block text-sm font-medium">
              Isolation boundary
            </label>
            <select
              id="ifa-boundary"
              value={isolationBoundary}
              onChange={(e) => setIsolationBoundary(e.target.value as BoundaryType)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {BOUNDARY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BOUNDARY_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label htmlFor="ifa-memory" className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                id="ifa-memory"
                type="checkbox"
                checked={memoryControlEnabled}
                onChange={(e) => setMemoryControlEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Memory control (pin the analytics working set)
            </label>
          </div>
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Run simulation
          </button>
          <button
            type="button"
            onClick={applyMitigated}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Apply fully mitigated policies
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
            No runs yet. Try the default (weakest-policy) configuration, then apply the fully
            mitigated policies and run again.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <caption className="mb-2 text-left text-sm text-slate-500 dark:text-slate-400">
                Compound-incident comparison table. Runs are listed newest first.
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left dark:border-slate-700">
                  <th scope="col" className="py-2 pr-4">Scheduling</th>
                  <th scope="col" className="py-2 pr-4">Memory control</th>
                  <th scope="col" className="py-2 pr-4">Durability</th>
                  <th scope="col" className="py-2 pr-4">Isolation</th>
                  <th scope="col" className="py-2 pr-4">First failed constraint</th>
                  <th scope="col" className="py-2 pr-4">Stages held</th>
                </tr>
              </thead>
              <tbody>
                {runsDraft.value.map((run, i) => {
                  const params = run.config.params as unknown as IntegratedFailureAnalysisParams;
                  const firstFailedIndex = run.result.metrics.firstFailedStageIndex;
                  return (
                    <tr key={i} className="border-b border-slate-200 dark:border-slate-800">
                      <td className="py-2 pr-4">{SCHEDULING_POLICY_LABELS[params.schedulingPolicy]}</td>
                      <td className="py-2 pr-4">{params.memoryControlEnabled ? "On" : "Off"}</td>
                      <td className="py-2 pr-4">{IO_PATTERN_LABELS[params.durabilityPolicy]}</td>
                      <td className="py-2 pr-4">{BOUNDARY_LABELS[params.isolationBoundary]}</td>
                      <td className="py-2 pr-4">
                        {firstFailedIndex >= 0 ? stageLabel(STAGE_IDS[firstFailedIndex]) : "None (fully mitigated)"}
                      </td>
                      <td className="py-2 pr-4">
                        {run.result.metrics.stagesHeld} / {STAGE_IDS.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {runsDraft.value.map((run, i) => (
          <details key={i} className="mt-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium">
              Timeline for run #{runsDraft.value.length - i}:{" "}
              {run.result.metrics.fullyMitigated
                ? "fully mitigated"
                : `fails at ${stageLabel(STAGE_IDS[run.result.metrics.firstFailedStageIndex])}`}
            </summary>
            {renderTimeline(run)}
          </details>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="text-lg font-semibold">
          5. Integrated Simulation Evidence Record
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
          Export the incident comparison, per-run timelines, and evidence record as JSON, as CSV,
          or a print-ready worksheet.
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
