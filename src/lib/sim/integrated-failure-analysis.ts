import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";
import { POLICIES as SCHEDULING_POLICIES, type Policy as SchedulingPolicy } from "./scheduling-policy";
import { IO_PATTERNS, type IoPattern } from "./io-benchmark";
import { BOUNDARY_TYPES, type BoundaryType } from "./virtualization-isolation";

/**
 * Week 6: Integrated Operating-System Failure Analysis. One compound
 * incident hits four subsystems in a fixed order — scheduling, memory,
 * durability, and isolation — each governed by the same policy choice a
 * student made in Weeks 2-5. Each stage's fixed incident load either
 * violates that subsystem's constraint or doesn't, depending on the chosen
 * policy; the "first failed constraint" is whichever stage fails earliest,
 * because that is the stage whose failure is actually observed before any
 * later stage even gets a chance to matter (the incident isn't remediated
 * mid-run — a later, better-configured stage doesn't undo an earlier
 * failure). Running the same incident with the weakest policy at every
 * stage versus the strongest policy at every stage is exactly the
 * "with and without mitigation" comparison the week's activity calls for.
 */
export const STAGE_IDS = ["scheduling", "memory", "durability", "isolation"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const STAGE_LABELS: Record<StageId, string> = {
  scheduling: "Scheduling: a safety-alert burst arrives while low-priority jobs hold the CPU",
  memory: "Memory: a poor-locality analytics sweep runs during the incident",
  durability: "Durability: a power loss lands mid-write-burst",
  isolation: "Isolation: the noisy neighbor tenant triggers a kernel-level fault",
};

export const IntegratedFailureAnalysisParamsSchema = z.object({
  schedulingPolicy: z.enum(SCHEDULING_POLICIES),
  memoryControlEnabled: z.boolean(),
  durabilityPolicy: z.enum(IO_PATTERNS),
  isolationBoundary: z.enum(BOUNDARY_TYPES),
});
export type IntegratedFailureAnalysisParams = z.infer<typeof IntegratedFailureAnalysisParamsSchema>;

/** The weakest policy at every stage — the compound incident's default, worst-case configuration. */
export const INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS: IntegratedFailureAnalysisParams = {
  schedulingPolicy: "fifo",
  memoryControlEnabled: false,
  durabilityPolicy: "batch-sequential",
  isolationBoundary: "process",
};

/** The strongest policy at every stage — the fully mitigated configuration for the "with mitigation" run. */
export const FULLY_MITIGATED_PARAMS: IntegratedFailureAnalysisParams = {
  schedulingPolicy: "fair-share",
  memoryControlEnabled: true,
  durabilityPolicy: "sync-small",
  isolationBoundary: "vm",
};

/** Published seed every student's assessed comparison must use. */
export const ASSESSED_SEED = 100;

interface StageOutcome {
  constraintHeld: boolean;
  detail: string;
}

function evaluateScheduling(policy: SchedulingPolicy): StageOutcome {
  if (policy === "fair-share") {
    return {
      constraintHeld: true,
      detail: "fair-share preempts for the safety-alert class immediately; the deadline is met.",
    };
  }
  return {
    constraintHeld: false,
    detail: `${policy === "fifo" ? "FIFO" : "round-robin"} keeps running the already-dispatched low-priority job for at least one more burst/quantum; the safety-alert deadline is missed.`,
  };
}

function evaluateMemory(memoryControlEnabled: boolean): StageOutcome {
  if (memoryControlEnabled) {
    return {
      constraintHeld: true,
      detail: "the analytics phase's frames stay pinned; the working set survives the sweep without thrashing.",
    };
  }
  return {
    constraintHeld: false,
    detail: "with no memory control, the analytics sweep evicts the working set; the sliding-window fault rate crosses the thrashing threshold.",
  };
}

function evaluateDurability(policy: IoPattern): StageOutcome {
  if (policy === "sync-small") {
    return {
      constraintHeld: true,
      detail: "every write is fsynced before acknowledgment; the power loss finds nothing unflushed to lose.",
    };
  }
  return {
    constraintHeld: false,
    detail: "batched writes leave a large unflushed window; the power loss lands inside it and the buffered data is lost.",
  };
}

function evaluateIsolation(boundary: BoundaryType): StageOutcome {
  if (boundary === "vm") {
    return {
      constraintHeld: true,
      detail: "the hypervisor boundary contains the noisy tenant's kernel-level fault; the primary tenant is unaffected.",
    };
  }
  return {
    constraintHeld: false,
    detail: `the ${boundary === "process" ? "bare process" : "container"} boundary shares one kernel with the noisy tenant; its kernel-level fault reaches the primary tenant.`,
  };
}

function evaluateStage(stageId: StageId, params: IntegratedFailureAnalysisParams): StageOutcome {
  switch (stageId) {
    case "scheduling":
      return evaluateScheduling(params.schedulingPolicy);
    case "memory":
      return evaluateMemory(params.memoryControlEnabled);
    case "durability":
      return evaluateDurability(params.durabilityPolicy);
    case "isolation":
      return evaluateIsolation(params.isolationBoundary);
  }
}

function runIntegratedFailureAnalysis(params: IntegratedFailureAnalysisParams, rng: SeededRandom): RunResult {
  const trace: TraceEvent[] = [];
  let clock = 0;
  let firstFailedStageIndex = -1;
  let stagesHeld = 0;
  let stagesFailed = 0;

  for (let i = 0; i < STAGE_IDS.length; i++) {
    const stageId = STAGE_IDS[i];

    if (firstFailedStageIndex !== -1) {
      trace.push({
        index: trace.length,
        label: `stage:${stageId}`,
        detail: `${STAGE_LABELS[stageId]} -- never reached: the incident's first failed constraint (${STAGE_IDS[firstFailedStageIndex]}) already halted normal operation upstream.`,
        timestamp: clock,
        meta: { event: "stage", stageId, reached: false },
      });
      continue;
    }

    clock += rng.int(2, 5);

    const outcome = evaluateStage(stageId, params);
    if (outcome.constraintHeld) {
      stagesHeld += 1;
    } else {
      stagesFailed += 1;
      firstFailedStageIndex = i;
    }

    trace.push({
      index: trace.length,
      label: `stage:${stageId}`,
      detail: `${STAGE_LABELS[stageId]} -- ${outcome.detail}`,
      timestamp: clock,
      meta: { event: "stage", stageId, reached: true, constraintHeld: outcome.constraintHeld },
    });
  }

  const fullyMitigated = firstFailedStageIndex === -1;
  const metrics: Record<string, number> = {
    stagesReached: fullyMitigated ? STAGE_IDS.length : firstFailedStageIndex + 1,
    stagesHeld,
    stagesFailed,
    firstFailedStageIndex,
    fullyMitigated: fullyMitigated ? 1 : 0,
  };

  return {
    schemaVersion: 1,
    moduleId: "integrated-failure-analysis",
    scenarioId: fullyMitigated ? "fully-mitigated" : `first-failure-${STAGE_IDS[firstFailedStageIndex]}`,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const integratedFailureAnalysisModule: SimulationDefinition<IntegratedFailureAnalysisParams, RunResult> = {
  id: "integrated-failure-analysis",
  title: "Compound Incident Timeline",
  schemaVersion: 1,
  paramsSchema: IntegratedFailureAnalysisParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS,
  run: runIntegratedFailureAnalysis,
};
