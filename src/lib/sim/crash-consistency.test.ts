import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import { crashConsistencyModule, ASSESSED_SEED } from "./crash-consistency";

function run(crashPoint: "w1" | "w3" | "w4" | "w5" | "none") {
  return runSimulation(crashConsistencyModule, { crashPoint }, ASSESSED_SEED);
}

function findingCategories(result: ReturnType<typeof run>) {
  return result.trace.filter((e) => e.meta?.step === "fsck").map((e) => e.meta?.category as string);
}

describe("crashConsistencyModule golden seed (assessed seed 100)", () => {
  it("w1: bitmap says allocated but no inode exists -> orphaned allocation, repaired, nothing lost", () => {
    const result = run("w1");
    expect(result.metrics).toMatchObject({
      writesDurableBeforeCrash: 1,
      findingsCount: 1,
      repairedCount: 1,
      lostCount: 0,
      fileReachableAfterRecovery: 0,
    });
    expect(findingCategories(result)).toEqual(["orphaned-allocation"]);
  });

  it("w3: data allocated but never written -> bitmap disagreement, repaired, nothing of value lost", () => {
    const result = run("w3");
    expect(result.metrics).toMatchObject({ writesDurableBeforeCrash: 3, lostCount: 0 });
    expect(findingCategories(result).sort()).toEqual(["bitmap-disagreement", "missing-directory-reference"]);
  });

  it("w4: data written but not yet pointed to -> the write is genuinely lost, not just misfiled", () => {
    const result = run("w4");
    expect(result.metrics).toMatchObject({ writesDurableBeforeCrash: 4, lostCount: 1, repairedCount: 1 });
    expect(findingCategories(result).sort()).toEqual(["missing-directory-reference", "unreachable-data"]);
  });

  it("w5: inode complete and self-consistent, only the directory entry is missing -> recoverable via lost+found", () => {
    const result = run("w5");
    expect(result.metrics).toMatchObject({
      writesDurableBeforeCrash: 5,
      findingsCount: 1,
      lostCount: 0,
      ambiguousCount: 1,
      fileReachableViaLostFound: 1,
    });
    expect(findingCategories(result)).toEqual(["missing-directory-reference"]);
  });

  it("no crash: every write lands, fsck finds nothing to fix, the file is reachable by its real name", () => {
    const result = run("none");
    expect(result.metrics).toMatchObject({
      writesDurableBeforeCrash: 6,
      findingsCount: 0,
      fileReachableAfterRecovery: 1,
      fileReachableViaLostFound: 0,
    });
  });

  it("w4 loses data despite the write having 'happened': a sharper lesson than w3, which loses nothing", () => {
    expect(run("w4").metrics.lostCount).toBeGreaterThan(run("w3").metrics.lostCount);
  });

  it("is deterministic: identical crash point and seed produce identical results", () => {
    expect(run("w4")).toEqual(run("w4"));
  });
});
