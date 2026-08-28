import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import {
  virtualizationIsolationModule,
  VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS,
  ASSESSED_SEED,
  FAULT_TICK,
  type BoundaryType,
  type VirtualizationIsolationParams,
} from "./virtualization-isolation";

function run(boundary: BoundaryType, overrides: Partial<VirtualizationIsolationParams> = {}) {
  return runSimulation(
    virtualizationIsolationModule,
    { ...VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS, boundary, ...overrides },
    ASSESSED_SEED,
  );
}

describe("virtualizationIsolationModule golden seed (assessed seed 100)", () => {
  it("keeps CPU and memory controls independent from the selected boundary", () => {
    const baseline = run("container");
    const cpuOnly = run("container", { cpuControlEnabled: true });
    const memoryOnly = run("container", { memoryControlEnabled: true });

    expect(baseline.metrics.cpuControlEnabled).toBe(0);
    expect(baseline.metrics.memoryControlEnabled).toBe(0);
    expect(cpuOnly.metrics.cpuControlEnabled).toBe(1);
    expect(cpuOnly.metrics.memoryControlEnabled).toBe(0);
    expect(memoryOnly.metrics.cpuControlEnabled).toBe(0);
    expect(memoryOnly.metrics.memoryControlEnabled).toBe(1);
    expect(cpuOnly.metrics.cpuStarvationTicks).toBeLessThan(baseline.metrics.cpuStarvationTicks);
    expect(memoryOnly.metrics.memoryLimitBreaches).toBe(0);
    expect(baseline.metrics.memoryLimitBreaches).toBeGreaterThan(0);
  });

  it("models network and storage restrictions separately", () => {
    const network = run("container", { restriction: "network" });
    const storage = run("container", { restriction: "storage" });
    expect(network.metrics.networkPacketsDropped).toBeGreaterThan(0);
    expect(network.metrics.storageOpsThrottled).toBe(0);
    expect(storage.metrics.networkPacketsDropped).toBe(0);
    expect(storage.metrics.storageOpsThrottled).toBeGreaterThan(0);
  });

  it("every shared-kernel boundary goes idle after the uncontained fault", () => {
    for (const boundary of ["process", "container"] as const) {
      const result = run(boundary);
      const postFaultTicks = result.trace.filter(
        (event) => event.meta?.event === "tick" && event.timestamp > FAULT_TICK,
      );
      expect(postFaultTicks.length).toBeGreaterThan(0);
      for (const tick of postFaultTicks) {
        expect(tick.meta?.primaryAllocated).toBe(0);
        expect(tick.meta?.noisyAllocated).toBe(0);
        expect(tick.meta?.downAfterFault).toBe(true);
      }
    }
  });

  it("only the VM boundary contains the noisy tenant's kernel fault", () => {
    expect(run("process").metrics.faultContained).toBe(0);
    expect(run("container").metrics.faultContained).toBe(0);
    expect(run("vm").metrics.faultContained).toBe(1);
  });

  it("the VM keeps allocating after its contained fault", () => {
    const postFaultTicks = run("vm").trace.filter(
      (event) => event.meta?.event === "tick" && event.timestamp > FAULT_TICK,
    );
    expect(postFaultTicks.length).toBeGreaterThan(0);
    for (const tick of postFaultTicks) expect(tick.meta?.downAfterFault).toBe(false);
  });

  it("stronger isolation costs more overhead and boot latency", () => {
    const process = run("process");
    const container = run("container");
    const vm = run("vm");
    expect(process.metrics.overheadPercent).toBeLessThan(container.metrics.overheadPercent);
    expect(container.metrics.overheadPercent).toBeLessThan(vm.metrics.overheadPercent);
    expect(process.metrics.bootLatencyMs).toBeLessThan(container.metrics.bootLatencyMs);
    expect(container.metrics.bootLatencyMs).toBeLessThan(vm.metrics.bootLatencyMs);
  });

  it("is deterministic for identical controls and seed", () => {
    const params = { cpuControlEnabled: true, memoryControlEnabled: false, restriction: "network" as const };
    expect(run("container", params)).toEqual(run("container", params));
  });

  it("rejects unknown boundary and restriction values", () => {
    expect(() => runSimulation(
      virtualizationIsolationModule,
      { ...VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS, boundary: "bare-metal" },
      ASSESSED_SEED,
    )).toThrow();
    expect(() => runSimulation(
      virtualizationIsolationModule,
      { ...VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS, restriction: "filesystem" },
      ASSESSED_SEED,
    )).toThrow();
  });
});
