import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 2: Scheduling and Concurrency (synchronization half). Two HarborLink
 * threads — the safety-alert writer (A) and the sensor-ingestion writer (B)
 * — append to one shared ring buffer. The interleaving below is a fixed,
 * controlled script (per the course design document's "controlled
 * shared-buffer interleaving"), not randomized: only which correctness
 * mechanism guards it is a parameter. The seed only jitters timestamps —
 * the logical outcome (corrupted vs. correct) is the same for every seed.
 */
export const RING_BUFFER_MODES = ["unsafe", "mutex"] as const;
export type RingBufferMode = (typeof RING_BUFFER_MODES)[number];

export const RingBufferParamsSchema = z.object({
  mode: z.enum(RING_BUFFER_MODES),
});
export type RingBufferParams = z.infer<typeof RingBufferParamsSchema>;

export const RING_BUFFER_DEFAULT_PARAMS: RingBufferParams = { mode: "unsafe" };

export const RING_BUFFER_CAPACITY = 4;

/** Published seed every student's assessed run must use. */
export const ASSESSED_SEED = 100;

function buildUnsafeTrace(rng: SeededRandom, push: (thread: string, op: string, detail: string) => void) {
  const buffer: (string | null)[] = new Array(RING_BUFFER_CAPACITY).fill(null);
  let tail = 0;
  push("A", "read-tail", `A reads tail (sees ${tail})`);
  push("B", "read-tail", `B reads tail (sees ${tail})`); // B reads before A's write is visible: the race.
  buffer[tail] = "alert-A";
  push("A", "write-slot", `A writes buffer[${tail}] = "alert-A"`);
  const aComputedTail = tail + 1;
  push("A", "write-tail", `A writes tail = ${tail} + 1 = ${aComputedTail}`);
  tail = aComputedTail;
  const overwritten = buffer[0];
  buffer[0] = "alert-B"; // B still targets slot 0: its stale read never saw A's update.
  push("B", "write-slot", `B writes buffer[0] = "alert-B" (overwrites "${overwritten}")`);
  const bComputedTail = 0 + 1; // B's local snapshot of tail was 0, so it also computes 1.
  push("B", "write-tail", `B writes tail = 0 + 1 = ${bComputedTail} (lost update: expected 2)`);
  tail = bComputedTail;
  return { buffer, tail };
}

function buildMutexTrace(
  rng: SeededRandom,
  push: (thread: string, op: string, detail: string) => void,
  advanceClock: (ticks: number) => void,
) {
  const buffer: (string | null)[] = new Array(RING_BUFFER_CAPACITY).fill(null);
  let tail = 0;
  push("A", "acquire-lock", "A acquires the buffer lock");
  push("A", "read-tail", `A reads tail (sees ${tail})`);
  buffer[tail] = "alert-A";
  push("A", "write-slot", `A writes buffer[${tail}] = "alert-A"`);
  tail += 1;
  push("A", "write-tail", `A writes tail = ${tail}`);
  push("A", "release-lock", "A releases the buffer lock");

  const lockWaitTicks = rng.int(2, 4);
  push("B", "wait-for-lock", `B blocks for ${lockWaitTicks} tick(s) while A holds the lock`);
  advanceClock(lockWaitTicks);
  push("B", "acquire-lock", "B acquires the buffer lock");
  push("B", "read-tail", `B reads tail (sees ${tail})`);
  buffer[tail] = "alert-B";
  push("B", "write-slot", `B writes buffer[${tail}] = "alert-B"`);
  tail += 1;
  push("B", "write-tail", `B writes tail = ${tail}`);
  push("B", "release-lock", "B releases the buffer lock");

  return { buffer, tail, lockWaitTicks };
}

function runRingBuffer(params: RingBufferParams, rng: SeededRandom): RunResult {
  const trace: TraceEvent[] = [];
  let clock = 0;

  function push(thread: string, op: string, detail: string) {
    clock += rng.int(1, 2);
    trace.push({
      index: trace.length,
      label: `${thread}:${op}`,
      detail,
      timestamp: clock,
      meta: { thread, op },
    });
  }

  let lockWaitTicks = 0;
  let buffer: (string | null)[];
  let tail: number;
  if (params.mode === "unsafe") {
    const result = buildUnsafeTrace(rng, push);
    buffer = result.buffer;
    tail = result.tail;
  } else {
    const result = buildMutexTrace(rng, push, (ticks) => {
      clock += ticks;
    });
    buffer = result.buffer;
    tail = result.tail;
    lockWaitTicks = result.lockWaitTicks;
  }

  const entriesPersisted = buffer.filter((slot) => slot !== null).length;
  const correct = entriesPersisted === 2 && tail === 2;

  const metrics: Record<string, number> = {
    entriesAttempted: 2,
    entriesPersisted,
    finalTail: tail,
    correct: correct ? 1 : 0,
    lockWaitTicks,
  };

  return {
    schemaVersion: 1,
    moduleId: "ring-buffer",
    scenarioId: params.mode,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const ringBufferModule: SimulationDefinition<RingBufferParams, RunResult> = {
  id: "ring-buffer",
  title: "Shared Ring-Buffer Interleaving",
  schemaVersion: 1,
  paramsSchema: RingBufferParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: RING_BUFFER_DEFAULT_PARAMS,
  run: runRingBuffer,
};
