import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 4: Crash Consistency (I/O half). A fio-equivalent comparison of two
 * write patterns against the same HarborLink edge disk: many small
 * synchronous writes versus large sequential batched writes. The
 * documented test parameters are fixed per pattern (not seeded) so the
 * comparison is reproducible; the seed only jitters the measured numbers
 * within a realistic band, the way repeated fio runs vary slightly.
 */
export const IO_PATTERNS = ["sync-small", "batch-sequential"] as const;
export type IoPattern = (typeof IO_PATTERNS)[number];

export const IO_PATTERN_LABELS: Record<IoPattern, string> = {
  "sync-small": "Small synchronous writes",
  "batch-sequential": "Sequential batched writes",
};

export const IoBenchmarkParamsSchema = z.object({
  pattern: z.enum(IO_PATTERNS),
});
export type IoBenchmarkParams = z.infer<typeof IoBenchmarkParamsSchema>;

export const IO_BENCHMARK_DEFAULT_PARAMS: IoBenchmarkParams = { pattern: "sync-small" };

/** Published seed every student's assessed comparison must use. */
export const ASSESSED_SEED = 100;

/**
 * Documented, fixed test parameters per pattern - not seeded, so the setup
 * itself is reproducible. `flushIntervalOps` is the durability-relevant
 * number: queue depth only bounds concurrent in-flight I/O, not how much
 * previously "completed" (but unflushed) data can still be lost. Sync-small
 * has no flush interval because every op is individually fsync'd.
 */
export const TEST_PARAMETERS: Record<
  IoPattern,
  { blockSizeKB: number; totalOps: number; queueDepth: number; fsyncEveryOp: boolean; flushIntervalOps: number | null }
> = {
  "sync-small": { blockSizeKB: 4, totalOps: 500, queueDepth: 1, fsyncEveryOp: true, flushIntervalOps: null },
  "batch-sequential": { blockSizeKB: 4096, totalOps: 20, queueDepth: 4, fsyncEveryOp: false, flushIntervalOps: 4 },
};

function runIoBenchmark(params: IoBenchmarkParams, rng: SeededRandom): RunResult {
  const trace: TraceEvent[] = [];
  const testParams = TEST_PARAMETERS[params.pattern];
  let clock = 0;

  let iops: number;
  let meanLatencyMs: number;
  let p95Multiplier: number;
  let atRiskBytes: number;

  if (params.pattern === "sync-small") {
    iops = rng.int(180, 260);
    meanLatencyMs = Number(rng.float(3.5, 5.5).toFixed(2));
    p95Multiplier = rng.float(2.2, 2.8);
    // Each write is fsync'd before it returns: at most one write's worth of data is ever at risk.
    atRiskBytes = testParams.blockSizeKB * 1024;
  } else {
    // "IOPS" here means batches/sec, not individual 4 KB ops - at a 4 MB
    // block size, comparing raw IOPS across patterns is the classic
    // benchmarking gotcha: bandwidth is the number that's actually
    // comparable, and it's bandwidth that tells the real story here.
    iops = rng.int(30, 60);
    meanLatencyMs = Number(rng.float(0.3, 0.6).toFixed(2));
    p95Multiplier = rng.float(1.5, 2.0);
    // Writes return once buffered, not once durable; everything issued since
    // the last periodic flush is still at risk if a crash lands first.
    atRiskBytes = testParams.blockSizeKB * 1024 * (testParams.flushIntervalOps ?? testParams.totalOps);
  }

  const bandwidthMBps = Number(((iops * testParams.blockSizeKB) / 1024).toFixed(2));
  const p95LatencyMs = Number((meanLatencyMs * p95Multiplier).toFixed(2));

  for (let i = 0; i < 8; i++) {
    const sampleLatency = Number((meanLatencyMs * rng.float(0.7, 1.4)).toFixed(2));
    clock += Math.max(1, Math.round(sampleLatency));
    trace.push({
      index: trace.length,
      label: `${params.pattern}:sample-op`,
      detail: `Sample op ${i + 1}: ${testParams.blockSizeKB} KB write, ${sampleLatency} ms latency`,
      timestamp: clock,
      meta: { pattern: params.pattern, sampleLatencyMs: sampleLatency },
    });
  }

  const metrics: Record<string, number> = {
    iops,
    bandwidthMBps,
    meanLatencyMs,
    p95LatencyMs,
    atRiskBytes,
    blockSizeKB: testParams.blockSizeKB,
    totalOps: testParams.totalOps,
    queueDepth: testParams.queueDepth,
    fsyncEveryOp: testParams.fsyncEveryOp ? 1 : 0,
    flushIntervalOps: testParams.flushIntervalOps ?? 0,
  };

  return {
    schemaVersion: 1,
    moduleId: "io-benchmark",
    scenarioId: params.pattern,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const ioBenchmarkModule: SimulationDefinition<IoBenchmarkParams, RunResult> = {
  id: "io-benchmark",
  title: "I/O Pattern Benchmark",
  schemaVersion: 1,
  paramsSchema: IoBenchmarkParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: IO_BENCHMARK_DEFAULT_PARAMS,
  run: runIoBenchmark,
};
