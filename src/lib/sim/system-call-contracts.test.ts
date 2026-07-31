import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import {
  systemCallContractsModule,
  findFirstDivergenceIndex,
  ASSESSED_SEED,
} from "./system-call-contracts";

function run(scenario: "normal" | "missing-config" | "denied-write" | "interrupted-write", seed = ASSESSED_SEED) {
  return runSimulation(systemCallContractsModule, { scenario }, seed);
}

describe("systemCallContractsModule golden seed (assessed seed 100)", () => {
  it("normal execution visits every category and exits 0", () => {
    const result = run("normal");
    expect(result.metrics).toMatchObject({
      totalCalls: 17,
      exitCode: 0,
      calls_process: 2,
      calls_protection: 1,
      calls_memory: 2,
      calls_file: 11,
      calls_communication: 1,
      errorReturns: 0,
    });
  });

  it("missing configuration fails at the config openat and exits 78 (EX_CONFIG)", () => {
    const result = run("missing-config");
    expect(result.metrics).toMatchObject({
      totalCalls: 9,
      exitCode: 78,
      calls_communication: 0,
      errorReturns: 1,
    });
    expect(result.trace.at(-1)?.label).toBe("process:exit_group");
    expect(result.trace.at(-2)?.meta).toMatchObject({ errno: "ENOENT" });
  });

  it("denied log-file write fails at the alert-log openat and exits 74 (EX_IOERR)", () => {
    const result = run("denied-write");
    expect(result.metrics).toMatchObject({
      totalCalls: 14,
      exitCode: 74,
      errorReturns: 1,
    });
    expect(result.trace.at(-2)?.meta).toMatchObject({ errno: "EACCES" });
  });

  it("interrupted write recovers with one retried write and still exits 0", () => {
    const result = run("interrupted-write");
    expect(result.metrics).toMatchObject({
      totalCalls: 18,
      exitCode: 0,
      errorReturns: 1,
    });
    const writeEvents = result.trace.filter((e) => e.label === "file:write");
    expect(writeEvents).toHaveLength(2);
    expect(writeEvents[0].meta).toMatchObject({ errno: "EINTR" });
    expect(writeEvents[1].meta).toMatchObject({ returnValue: "96" });
  });

  it("is deterministic: identical scenario and seed produce identical traces", () => {
    expect(run("interrupted-write")).toEqual(run("interrupted-write"));
  });
});

describe("findFirstDivergenceIndex against the normal run (assessed seed 100)", () => {
  const normal = run("normal").trace;

  it("locates the config-read divergence for missing configuration", () => {
    const index = findFirstDivergenceIndex(normal, run("missing-config").trace);
    expect(index).toBe(7);
    expect(normal[7].label).toBe("file:openat");
  });

  it("locates the alert-log-open divergence for denied write", () => {
    const index = findFirstDivergenceIndex(normal, run("denied-write").trace);
    expect(index).toBe(12);
  });

  it("locates the write-call divergence for interrupted write", () => {
    const index = findFirstDivergenceIndex(normal, run("interrupted-write").trace);
    expect(index).toBe(13);
  });

  it("returns null for two identical traces", () => {
    expect(findFirstDivergenceIndex(normal, run("normal").trace)).toBeNull();
  });
});
