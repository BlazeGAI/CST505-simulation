import { describe, expect, it } from "vitest";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";
import { createScenarioConfig } from "@/lib/schemas/scenario-config";
import { parseIntegratedEvidencePackage } from "./integrated-evidence";

function packageJson(moduleId: string, configModuleId: string, params: Record<string, unknown>) {
  const config = createScenarioConfig({ moduleId: configModuleId, scenarioId: "test", seed: 505, params });
  return JSON.stringify({
    schemaVersion: 1,
    appVersion: "0.2.0",
    exportedAt: "2026-08-28T00:00:00.000Z",
    moduleId,
    moduleTitle: "Test",
    runs: [{
      config,
      result: {
        schemaVersion: 1,
        moduleId: configModuleId,
        scenarioId: "test",
        seed: 505,
        metrics: {},
        trace: [],
      },
    }],
    evidenceRecord: createEmptyEvidenceRecord({ moduleId, scenarioId: "test", seed: 505 }),
  });
}

describe("integrated evidence import", () => {
  it("maps supported exports from Simulations 2-5 into integrated selections", () => {
    expect(parseIntegratedEvidencePackage(packageJson(
      "scheduling-and-concurrency",
      "scheduling-policy",
      { policy: "round-robin", timeQuantum: 4 },
    )).selection).toEqual({ schedulingPolicy: "round-robin" });

    expect(parseIntegratedEvidencePackage(packageJson(
      "virtual-memory",
      "virtual-memory",
      { policy: "lru", frames: 4, isolateAnalytics: true },
    )).selection).toEqual({ memoryControlEnabled: true });

    expect(parseIntegratedEvidencePackage(packageJson(
      "crash-consistency",
      "io-benchmark",
      { pattern: "sync-small" },
    )).selection).toEqual({ durabilityPolicy: "sync-small" });

    expect(parseIntegratedEvidencePackage(packageJson(
      "virtualization-and-isolation",
      "virtualization-isolation",
      { boundary: "vm" },
    )).selection).toEqual({ isolationBoundary: "vm" });
  });

  it("rejects malformed and unrelated files", () => {
    expect(() => parseIntegratedEvidencePackage("not json")).toThrow("not valid JSON");
    expect(() => parseIntegratedEvidencePackage(packageJson(
      "system-call-contracts",
      "system-call-contracts",
      { scenario: "normal" },
    ))).toThrow("Only evidence packages from Simulations 2-5");
  });
});
