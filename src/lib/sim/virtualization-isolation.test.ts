import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { virtualizationIsolationModule, ASSESSED_SEED, FAULT_TICK, type BoundaryType } from "./virtualization-isolation";

function run(boundary: BoundaryType) {
  return runSimulation(virtualizationIsolationModule, { boundary }, ASSESSED_SEED);
}

describe("virtualizationIsolationModule golden seed (assessed seed 100)", () => {
  it("neither process nor an unbounded container caps the noisy tenant's CPU share", () => {
    const process = run("process");
    const containerUnbounded = run("container-unbounded");
    expect(process.metrics).toMatchObject({ cpuStarvationTicks: 10, totalCpuDeficit: 161 });
    expect(containerUnbounded.metrics).toMatchObject({ cpuStarvationTicks: 10, totalCpuDeficit: 161 });
  });

  it("a cgroup CPU cap eliminates burst-driven starvation, but not the shared-kernel fault's downtime", () => {
    const containerLimited = run("container-limited");
    expect(containerLimited.metrics).toMatchObject({ cpuStarvationTicks: 4, totalCpuDeficit: 143 });
  });

  it("only the VM boundary has zero starvation, because it also contains the fault that causes it elsewhere", () => {
    const vm = run("vm");
    expect(vm.metrics).toMatchObject({ cpuStarvationTicks: 0, totalCpuDeficit: 0 });
  });

  it("every shared-kernel boundary goes fully idle for the remaining ticks after the uncontained fault", () => {
    for (const boundaryType of ["process", "container-unbounded", "container-limited"] as const) {
      const result = run(boundaryType);
      const postFaultTicks = result.trace.filter(
        (e) => e.meta?.event === "tick" && e.timestamp > FAULT_TICK,
      );
      expect(postFaultTicks.length).toBeGreaterThan(0);
      for (const tick of postFaultTicks) {
        expect(tick.meta?.primaryAllocated).toBe(0);
        expect(tick.meta?.noisyAllocated).toBe(0);
        expect(tick.meta?.downAfterFault).toBe(true);
      }
    }
  });

  it("the VM boundary keeps allocating normally after its contained fault", () => {
    const vm = run("vm");
    const postFaultTicks = vm.trace.filter((e) => e.meta?.event === "tick" && e.timestamp > FAULT_TICK);
    expect(postFaultTicks.length).toBeGreaterThan(0);
    for (const tick of postFaultTicks) {
      expect(tick.meta?.downAfterFault).toBe(false);
    }
  });

  it("only the VM boundary contains the noisy tenant's kernel-level fault — every shared-kernel boundary does not", () => {
    expect(run("process").metrics.faultContained).toBe(0);
    expect(run("container-unbounded").metrics.faultContained).toBe(0);
    expect(run("container-limited").metrics.faultContained).toBe(0);
    expect(run("vm").metrics.faultContained).toBe(1);
  });

  it("memory caps are enforced by containers-with-limits and VMs, but not by process or an unbounded container", () => {
    expect(run("process").metrics.memoryCapEnforced).toBe(0);
    expect(run("container-unbounded").metrics.memoryCapEnforced).toBe(0);
    expect(run("container-limited").metrics.memoryCapEnforced).toBe(1);
    expect(run("vm").metrics.memoryCapEnforced).toBe(1);
  });

  it("stronger isolation costs more overhead and boot latency: process < container < vm", () => {
    const process = run("process");
    const container = run("container-limited");
    const vm = run("vm");
    expect(process.metrics.overheadPercent).toBeLessThan(container.metrics.overheadPercent);
    expect(container.metrics.overheadPercent).toBeLessThan(vm.metrics.overheadPercent);
    expect(process.metrics.bootLatencyMs).toBeLessThan(container.metrics.bootLatencyMs);
    expect(container.metrics.bootLatencyMs).toBeLessThan(vm.metrics.bootLatencyMs);
  });

  it("logs the kernel-fault event and its containment outcome in the trace", () => {
    const vm = run("vm");
    const faultEvent = vm.trace.find((e) => e.label === "noisy:kernel-fault");
    expect(faultEvent?.meta?.contained).toBe(true);

    const process = run("process");
    const processFaultEvent = process.trace.find((e) => e.label === "noisy:kernel-fault");
    expect(processFaultEvent?.meta?.contained).toBe(false);
  });

  it("is deterministic: same seed and boundary produce an identical result", () => {
    expect(run("container-limited")).toEqual(run("container-limited"));
  });

  it("rejects an unknown boundary type", () => {
    expect(() => runSimulation(virtualizationIsolationModule, { boundary: "bare-metal" }, ASSESSED_SEED)).toThrow();
  });
});
