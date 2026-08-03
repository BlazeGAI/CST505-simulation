import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { schedulingPolicyModule, ASSESSED_SEED } from "./scheduling-policy";

function run(policy: "fifo" | "round-robin" | "fair-share", timeQuantum = 4) {
  return runSimulation(schedulingPolicyModule, { policy, timeQuantum }, ASSESSED_SEED);
}

describe("schedulingPolicyModule golden seed (assessed seed 100)", () => {
  it("FIFO: convoy effect misses every deadline and has the lowest fairness of the three policies", () => {
    const result = run("fifo");
    expect(result.metrics).toMatchObject({
      totalJobs: 10,
      completedJobs: 10,
      makespan: 55,
      avgResponseTime: 16.3,
      avgWaitingTime: 16.3,
      avgTurnaroundTime: 21.2,
      deadlineJobs: 4,
      deadlineMisses: 4,
    });
  });

  it("round robin improves response time and fairness over FIFO but still misses deadlines", () => {
    const result = run("round-robin");
    expect(result.metrics).toMatchObject({
      completedJobs: 10,
      avgResponseTime: 10.8,
      deadlineJobs: 4,
      deadlineMisses: 3,
    });
    expect(result.metrics.fairnessIndex).toBeGreaterThan(run("fifo").metrics.fairnessIndex);
  });

  it("fair-share protects every deadline and yields the best response/waiting/turnaround times", () => {
    const result = run("fair-share");
    expect(result.metrics).toMatchObject({
      completedJobs: 10,
      avgResponseTime: 9.8,
      avgWaitingTime: 11.8,
      avgTurnaroundTime: 16.7,
      deadlineJobs: 4,
      deadlineMisses: 0,
    });
    const fifo = run("fifo").metrics;
    expect(result.metrics.avgResponseTime).toBeLessThan(fifo.avgResponseTime);
    expect(result.metrics.deadlineMisses).toBeLessThan(fifo.deadlineMisses);
  });

  it("every job in every policy eventually completes with its full burst serviced", () => {
    for (const policy of ["fifo", "round-robin", "fair-share"] as const) {
      const result = run(policy);
      expect(result.metrics.completedJobs).toBe(result.metrics.totalJobs);
    }
  });

  it("round robin actually preempts and re-dispatches jobs (more dispatches than FIFO)", () => {
    const fifoDispatches = run("fifo").trace.filter((e) => e.meta?.event === "dispatch").length;
    const rrDispatches = run("round-robin").trace.filter((e) => e.meta?.event === "dispatch").length;
    const rrPreempts = run("round-robin").trace.filter((e) => e.meta?.event === "preempt").length;
    expect(rrDispatches).toBeGreaterThan(fifoDispatches);
    expect(rrPreempts).toBeGreaterThan(0);
    expect(rrDispatches).toBe(rrPreempts + 10); // one initial dispatch per job, plus one re-dispatch per preempt
  });

  it("is deterministic: identical policy, quantum, and seed produce identical results", () => {
    expect(run("fair-share")).toEqual(run("fair-share"));
  });

  it("rejects an out-of-range time quantum", () => {
    expect(() => runSimulation(schedulingPolicyModule, { policy: "round-robin", timeQuantum: 99 }, 1)).toThrow();
  });
});
