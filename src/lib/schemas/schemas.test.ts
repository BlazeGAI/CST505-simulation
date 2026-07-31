import { describe, expect, it } from "vitest";
import { ScenarioConfigSchema, createScenarioConfig } from "./scenario-config";
import { RunResultSchema } from "./run-result";
import { EvidenceRecordSchema, createEmptyEvidenceRecord } from "./evidence-record";
import { ExportPackageSchema } from "./export-package";

describe("scenario config schema", () => {
  it("accepts a well-formed config", () => {
    const config = createScenarioConfig({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
      params: { eventCount: 10 },
    });
    expect(() => ScenarioConfigSchema.parse(config)).not.toThrow();
  });

  it("rejects a wrong schema version", () => {
    const config = createScenarioConfig({
      moduleId: "reference-demo",
      scenarioId: "x",
      seed: 1,
      params: {},
    });
    expect(() => ScenarioConfigSchema.parse({ ...config, schemaVersion: 999 })).toThrow();
  });
});

describe("run result schema", () => {
  it("accepts a well-formed result", () => {
    const result = {
      schemaVersion: 1,
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
      metrics: { totalCompleted: 10 },
      trace: [{ index: 0, label: "arrival", timestamp: 1 }],
    };
    expect(() => RunResultSchema.parse(result)).not.toThrow();
  });
});

describe("evidence record schema", () => {
  it("round-trips an empty record created by createEmptyEvidenceRecord", () => {
    const record = createEmptyEvidenceRecord({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
    });
    expect(() => EvidenceRecordSchema.parse(record)).not.toThrow();
  });
});

describe("export package schema", () => {
  it("accepts a package containing one run and an evidence record", () => {
    const config = createScenarioConfig({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
      params: { eventCount: 10 },
    });
    const result = {
      schemaVersion: 1,
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
      metrics: { totalCompleted: 10 },
      trace: [],
    };
    const evidenceRecord = createEmptyEvidenceRecord({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
    });
    const pkg = {
      schemaVersion: 1,
      appVersion: "0.1.0",
      exportedAt: new Date().toISOString(),
      moduleId: "reference-demo",
      moduleTitle: "Foundation Engine Demo",
      runs: [{ config, result }],
      evidenceRecord,
    };
    expect(() => ExportPackageSchema.parse(pkg)).not.toThrow();
  });
});
