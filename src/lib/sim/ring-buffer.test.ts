import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { ringBufferModule, ASSESSED_SEED } from "./ring-buffer";

function run(mode: "unsafe" | "mutex") {
  return runSimulation(ringBufferModule, { mode }, ASSESSED_SEED);
}

describe("ringBufferModule golden seed (assessed seed 100)", () => {
  it("unsafe mode reproduces a lost update: one alert is silently overwritten", () => {
    const result = run("unsafe");
    expect(result.metrics).toMatchObject({
      entriesAttempted: 2,
      entriesPersisted: 1,
      finalTail: 1,
      correct: 0,
      lockWaitTicks: 0,
    });
    const writeSlotEvents = result.trace.filter((e) => e.meta?.op === "write-slot");
    expect(writeSlotEvents).toHaveLength(2);
    expect(writeSlotEvents.every((e) => e.detail?.includes("buffer[0]"))).toBe(true);
  });

  it("mutex mode is correct: both alerts persist, at the cost of B waiting for the lock", () => {
    const result = run("mutex");
    expect(result.metrics).toMatchObject({
      entriesAttempted: 2,
      entriesPersisted: 2,
      finalTail: 2,
      correct: 1,
    });
    expect(result.metrics.lockWaitTicks).toBeGreaterThan(0);
    const waitEvent = result.trace.find((e) => e.meta?.op === "wait-for-lock");
    expect(waitEvent).toBeDefined();
  });

  it("mutex never interleaves A's and B's critical sections", () => {
    const events = run("mutex").trace;
    const aRelease = events.findIndex((e) => e.label === "A:release-lock");
    const bAcquire = events.findIndex((e) => e.label === "B:acquire-lock");
    expect(aRelease).toBeGreaterThanOrEqual(0);
    expect(bAcquire).toBeGreaterThan(aRelease);
  });

  it("is deterministic: identical mode and seed produce identical traces", () => {
    expect(run("unsafe")).toEqual(run("unsafe"));
    expect(run("mutex")).toEqual(run("mutex"));
  });

  it("the corruption outcome is the same across seeds; only timing jitter and lock-wait ticks vary", () => {
    const a = runSimulation(ringBufferModule, { mode: "unsafe" }, 1);
    const b = runSimulation(ringBufferModule, { mode: "unsafe" }, 2);
    expect(a.metrics.correct).toBe(b.metrics.correct);
    expect(a.metrics.entriesPersisted).toBe(b.metrics.entriesPersisted);
  });
});
