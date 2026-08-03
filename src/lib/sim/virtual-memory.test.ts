import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { virtualMemoryModule, ASSESSED_SEED } from "./virtual-memory";

function run(policy: "fifo" | "lru" | "clock", frames: number, isolateAnalytics = false) {
  return runSimulation(virtualMemoryModule, { policy, frames, isolateAnalytics }, ASSESSED_SEED);
}

describe("virtualMemoryModule golden seed (assessed seed 100)", () => {
  it("at 4 frames, LRU faults less than FIFO despite an identical reference string", () => {
    const fifo = run("fifo", 4);
    const lru = run("lru", 4);
    expect(fifo.metrics).toMatchObject({ frames: 4, totalRefs: 54, faults: 29, hits: 25 });
    expect(lru.metrics).toMatchObject({ frames: 4, totalRefs: 54, faults: 28, hits: 26 });
    expect(lru.metrics.faults).toBeLessThan(fifo.metrics.faults);
  });

  it("Clock costs more faults than true LRU at 4 frames; all three tie when memory is very tight (3) or loose (6)", () => {
    const clock4 = run("clock", 4);
    const lru4 = run("lru", 4);
    const fifo4 = run("fifo", 4);
    expect(clock4.metrics.faults).toBe(30);
    expect(clock4.metrics.faults).toBeGreaterThan(lru4.metrics.faults);
    expect(clock4.metrics.faults).toBeGreaterThan(fifo4.metrics.faults);

    for (const frames of [3, 6]) {
      const faults = new Set(["fifo", "lru", "clock"].map((p) => run(p as "fifo" | "lru" | "clock", frames).metrics.faults));
      expect(faults.size).toBe(1); // all three policies fault the same number of times
    }
  });

  it("more frames never increases faults for any of these three policies on this reference string", () => {
    for (const policy of ["fifo", "lru", "clock"] as const) {
      const faults3 = run(policy, 3).metrics.faults;
      const faults4 = run(policy, 4).metrics.faults;
      const faults6 = run(policy, 6).metrics.faults;
      expect(faults4).toBeLessThanOrEqual(faults3);
      expect(faults6).toBeLessThanOrEqual(faults4);
    }
  });

  it("flags thrashing with the underlying window fault rate exposed, not just a bare label", () => {
    const result = run("fifo", 3);
    expect(result.metrics.thrashingDetectedAtIndex).toBeGreaterThanOrEqual(0);
    expect(result.metrics.thrashingWindowFaultRate).toBeGreaterThanOrEqual(0.6);
  });

  it("never flags thrashing from compulsory cold-start misses alone (regression: was always index 7)", () => {
    for (const policy of ["fifo", "lru", "clock"] as const) {
      for (const frames of [3, 4, 6, 8]) {
        // 16 references make up the cold-start ingestion phase; a real
        // thrashing signal must come from contention afterward, not from
        // the working set simply filling up for the first time.
        expect(run(policy, frames).metrics.thrashingDetectedAtIndex).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it("isolateAnalytics protects hot pages through the analytics sweep, improving the post-sweep recovery hit rate", () => {
    const off = run("lru", 4, false);
    const on = run("lru", 4, true);
    expect(off.metrics).toMatchObject({ recoveryHits: 2, recoveryFaults: 4, controlApplied: 0 });
    expect(on.metrics).toMatchObject({ recoveryHits: 3, recoveryFaults: 3, controlApplied: 1 });
    expect(on.metrics.recoveryHits).toBeGreaterThan(off.metrics.recoveryHits);
    expect(on.metrics.faults).toBeLessThan(off.metrics.faults);
  });

  it("never throws when isolateAnalytics pins frames at the minimum frame count (regression: used to pin every frame)", () => {
    for (const policy of ["fifo", "lru", "clock"] as const) {
      expect(() => run(policy, 2, true)).not.toThrow();
      const result = run(policy, 2, true);
      expect(result.metrics.faults + result.metrics.hits).toBe(result.metrics.totalRefs);
    }
  });

  it("is deterministic: identical params and seed produce identical results", () => {
    expect(run("clock", 4)).toEqual(run("clock", 4));
  });

  it("rejects an out-of-range frame count", () => {
    expect(() => runSimulation(virtualMemoryModule, { policy: "lru", frames: 20, isolateAnalytics: false }, 1)).toThrow();
  });
});
