import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { virtualizationIsolationModule, ASSESSED_SEED, type BoundaryType } from "./virtualization-isolation";

function run(boundary: BoundaryType) {
  return runSimulation(virtualizationIsolationModule, { boundary }, ASSESSED_SEED);
}

describe("virtualizationIsolationModule golden seed (assessed seed 100)", () => {
  it("neither process nor an unbounded container caps the noisy tenant's CPU share", () => {
    const process = run("process");
    const containerUnbounded = run("container-unbounded");
    expect(process.metrics).toMatchObject({ cpuStarvationTicks: 6, totalCpuDeficit: 18 });
    expect(containerUnbounded.metrics).toMatchObject({ cpuStarvationTicks: 6, totalCpuDeficit: 18 });
  });

  it("a cgroup CPU cap and a VM's fixed partition both eliminate primary starvation", () => {
    const containerLimited = run("container-limited");
    const vm = run("vm");
    expect(containerLimited.metrics).toMatchObject({ cpuStarvationTicks: 0, totalCpuDeficit: 0 });
    expect(vm.metrics).toMatchObject({ cpuStarvationTicks: 0, totalCpuDeficit: 0 });
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
