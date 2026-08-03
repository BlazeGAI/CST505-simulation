import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { ioBenchmarkModule, ASSESSED_SEED, TEST_PARAMETERS } from "./io-benchmark";

function run(pattern: "sync-small" | "batch-sequential") {
  return runSimulation(ioBenchmarkModule, { pattern }, ASSESSED_SEED);
}

describe("ioBenchmarkModule golden seed (assessed seed 100)", () => {
  it("batched sequential writes have dramatically higher bandwidth than small synchronous writes", () => {
    const sync = run("sync-small");
    const batch = run("batch-sequential");
    expect(sync.metrics.bandwidthMBps).toBeCloseTo(0.77, 1);
    expect(batch.metrics.bandwidthMBps).toBeCloseTo(144, 0);
    expect(batch.metrics.bandwidthMBps).toBeGreaterThan(sync.metrics.bandwidthMBps * 50);
  });

  it("batched writes return faster per op (buffered) but put far more data at risk if a crash lands mid-batch", () => {
    const sync = run("sync-small");
    const batch = run("batch-sequential");
    expect(batch.metrics.meanLatencyMs).toBeLessThan(sync.metrics.meanLatencyMs);
    expect(batch.metrics.atRiskBytes).toBeGreaterThan(sync.metrics.atRiskBytes);
    // Sync writes are fsync'd individually: at most one block's worth is ever at risk.
    expect(sync.metrics.atRiskBytes).toBe(TEST_PARAMETERS["sync-small"].blockSizeKB * 1024);
  });

  it("reports the documented, fixed test parameters alongside the measured numbers", () => {
    const sync = run("sync-small");
    expect(sync.metrics).toMatchObject({
      blockSizeKB: TEST_PARAMETERS["sync-small"].blockSizeKB,
      totalOps: TEST_PARAMETERS["sync-small"].totalOps,
      queueDepth: TEST_PARAMETERS["sync-small"].queueDepth,
      fsyncEveryOp: 1,
    });
  });

  it("p95 latency is always at or above mean latency", () => {
    for (const pattern of ["sync-small", "batch-sequential"] as const) {
      const result = run(pattern);
      expect(result.metrics.p95LatencyMs).toBeGreaterThanOrEqual(result.metrics.meanLatencyMs);
    }
  });

  it("is deterministic: identical pattern and seed produce identical results", () => {
    expect(run("batch-sequential")).toEqual(run("batch-sequential"));
  });
});
