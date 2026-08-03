import { describe, expect, it } from "vitest";
import { analyzeVirtualizability, POPEK_GOLDBERG_INSTRUCTIONS } from "./popek-goldberg-example";

describe("Popek-Goldberg virtualizability reference (fixed instruction list)", () => {
  it("finds exactly one sensitive-but-unprivileged violator (POPF)", () => {
    const analysis = analyzeVirtualizability();
    expect(analysis.violators).toHaveLength(1);
    expect(analysis.violators[0].mnemonic).toBe("POPF");
  });

  it("is not strictly virtualizable, because a violator exists", () => {
    const analysis = analyzeVirtualizability();
    expect(analysis.isStrictlyVirtualizable).toBe(false);
  });

  it("every violator is sensitive but not privileged, by definition", () => {
    const analysis = analyzeVirtualizability();
    for (const violator of analysis.violators) {
      expect(violator.sensitive).toBe(true);
      expect(violator.privileged).toBe(false);
    }
  });

  it("would be strictly virtualizable if the violator were removed", () => {
    const withoutViolator = POPEK_GOLDBERG_INSTRUCTIONS.filter((i) => i.mnemonic !== "POPF");
    const analysis = analyzeVirtualizability(withoutViolator);
    expect(analysis.violators).toHaveLength(0);
    expect(analysis.isStrictlyVirtualizable).toBe(true);
  });

  it("counts sensitive and privileged instructions correctly", () => {
    const analysis = analyzeVirtualizability();
    expect(analysis.sensitiveCount).toBe(6);
    expect(analysis.privilegedCount).toBe(5);
  });

  it("is deterministic and requires no seed", () => {
    expect(analyzeVirtualizability()).toEqual(analyzeVirtualizability());
  });
});
