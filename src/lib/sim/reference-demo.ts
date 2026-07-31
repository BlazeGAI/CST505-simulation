import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * "Foundation engine demo" — a small, generic queue simulation used ONLY to
 * exercise the shared engine contract, evidence record, local draft
 * storage, and export pipeline end to end before any of the six graded
 * modules exist. It is intentionally not scheduling, memory, or syscall
 * content: each of those ships fully in its own follow-up pull request
 * with its own golden-seed tests. See docs/roadmap.md.
 */
export const ReferenceDemoParamsSchema = z.object({
  eventCount: z.number().int().min(5).max(40),
  arrivalPace: z.enum(["steady", "bursty"]),
  injectFailure: z.boolean(),
});

export type ReferenceDemoParams = z.infer<typeof ReferenceDemoParamsSchema>;

export const REFERENCE_DEMO_DEFAULT_PARAMS: ReferenceDemoParams = {
  eventCount: 12,
  arrivalPace: "steady",
  injectFailure: false,
};

function runReferenceDemo(params: ReferenceDemoParams, rng: SeededRandom): RunResult {
  const trace: TraceEvent[] = [];
  let clock = 0;
  let queueDepth = 0;
  let maxQueueDepth = 0;
  let totalCompleted = 0;
  let totalDropped = 0;
  let waitTicksSum = 0;

  const failureAtIndex = params.injectFailure ? Math.floor(params.eventCount / 2) : -1;

  for (let i = 0; i < params.eventCount; i++) {
    const gap = params.arrivalPace === "steady" ? rng.int(1, 2) : rng.pick([1, 1, 4, 1]);
    clock += gap;
    queueDepth += 1;
    maxQueueDepth = Math.max(maxQueueDepth, queueDepth);
    trace.push({ index: trace.length, label: "arrival", detail: `event ${i}`, timestamp: clock });

    if (i === failureAtIndex) {
      queueDepth -= 1;
      totalDropped += 1;
      trace.push({
        index: trace.length,
        label: "dropped",
        detail: `event ${i} lost before service (injected failure)`,
        timestamp: clock,
      });
      continue;
    }

    const serviceTime = rng.int(1, 3);
    const waitTicks = serviceTime;
    waitTicksSum += waitTicks;
    clock += serviceTime;
    queueDepth -= 1;
    totalCompleted += 1;
    trace.push({
      index: trace.length,
      label: "service-complete",
      detail: `event ${i} serviced in ${serviceTime} tick(s)`,
      timestamp: clock,
    });
  }

  const result: RunResult = {
    schemaVersion: 1,
    moduleId: "reference-demo",
    scenarioId: params.injectFailure ? "reference-demo-failure" : "reference-demo-normal",
    seed: rng.seed,
    metrics: {
      totalArrivals: params.eventCount,
      totalCompleted,
      totalDropped,
      maxQueueDepth,
      averageWaitTicks: totalCompleted > 0 ? Number((waitTicksSum / totalCompleted).toFixed(2)) : 0,
      finalClock: clock,
    },
    trace,
  };

  return result;
}

export const referenceDemoModule: SimulationDefinition<ReferenceDemoParams, RunResult> = {
  id: "reference-demo",
  title: "Foundation Engine Demo",
  schemaVersion: 1,
  paramsSchema: ReferenceDemoParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: REFERENCE_DEMO_DEFAULT_PARAMS,
  run: runReferenceDemo,
};
