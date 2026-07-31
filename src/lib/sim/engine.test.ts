import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { referenceDemoModule } from "./reference-demo";

describe("runSimulation + referenceDemoModule", () => {
  it("is deterministic: identical params and seed produce identical results", () => {
    const params = { eventCount: 12, arrivalPace: "bursty" as const, injectFailure: true };
    const first = runSimulation(referenceDemoModule, params, 1234);
    const second = runSimulation(referenceDemoModule, params, 1234);
    expect(second).toEqual(first);
  });

  it("produces a different trace for a different seed with the same params", () => {
    const params = { eventCount: 12, arrivalPace: "bursty" as const, injectFailure: false };
    const a = runSimulation(referenceDemoModule, params, 1);
    const b = runSimulation(referenceDemoModule, params, 2);
    expect(a.trace).not.toEqual(b.trace);
  });

  it("golden seed: seed 42, 10 steady events, no failure, drops nothing and completes every event", () => {
    const result = runSimulation(
      referenceDemoModule,
      { eventCount: 10, arrivalPace: "steady", injectFailure: false },
      42,
    );
    expect(result.metrics.totalDropped).toBe(0);
    expect(result.metrics.totalCompleted).toBe(10);
    expect(result.trace).toHaveLength(20);
    expect(result.scenarioId).toBe("reference-demo-normal");
  });

  it("golden seed: injecting a failure drops exactly one event and still visits every arrival", () => {
    const result = runSimulation(
      referenceDemoModule,
      { eventCount: 10, arrivalPace: "steady", injectFailure: true },
      42,
    );
    expect(result.metrics.totalDropped).toBe(1);
    expect(result.metrics.totalCompleted).toBe(9);
    expect(result.trace.filter((e) => e.label === "arrival")).toHaveLength(10);
    expect(result.trace).toHaveLength(20);
    expect(result.scenarioId).toBe("reference-demo-failure");
  });

  it("rejects out-of-range params instead of silently clamping them", () => {
    expect(() =>
      runSimulation(referenceDemoModule, { eventCount: 999, arrivalPace: "steady", injectFailure: false }, 1),
    ).toThrow();
  });
});
