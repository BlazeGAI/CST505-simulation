import { describe, expect, it } from "vitest";
import { exportPackageToJson } from "./json";
import { exportPackageToCsv } from "./csv";
import { createScenarioConfig } from "../schemas/scenario-config";
import { createEmptyEvidenceRecord } from "../schemas/evidence-record";
import type { ExportPackage } from "../schemas/export-package";

function samplePackage(): ExportPackage {
  const config = createScenarioConfig({
    moduleId: "reference-demo",
    scenarioId: "reference-demo-normal",
    seed: 42,
    params: { eventCount: 10, arrivalPace: "steady", injectFailure: false },
  });
  return {
    schemaVersion: 1,
    appVersion: "0.1.0",
    exportedAt: "2026-01-01T00:00:00.000Z",
    moduleId: "reference-demo",
    moduleTitle: "Foundation Engine Demo",
    runs: [
      {
        config,
        result: {
          schemaVersion: 1,
          moduleId: "reference-demo",
          scenarioId: "reference-demo-normal",
          seed: 42,
          metrics: { totalCompleted: 10, totalDropped: 0 },
          trace: [],
        },
      },
    ],
    evidenceRecord: {
      ...createEmptyEvidenceRecord({
        moduleId: "reference-demo",
        scenarioId: "reference-demo-normal",
        seed: 42,
      }),
      prediction: 'Contains a "quote", a comma, and\na newline.',
    },
  };
}

describe("exportPackageToJson", () => {
  it("produces valid, re-parseable JSON with the schema version embedded", () => {
    const json = exportPackageToJson(samplePackage());
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.runs).toHaveLength(1);
  });
});

describe("exportPackageToCsv", () => {
  it("escapes commas, quotes, and newlines in free-text fields", () => {
    const csv = exportPackageToCsv(samplePackage());
    expect(csv).toContain('"Contains a ""quote"", a comma, and\na newline."');
  });

  it("includes one metrics header column per distinct metric across runs", () => {
    const csv = exportPackageToCsv(samplePackage());
    const [header] = csv.split("\n");
    expect(header).toContain("totalCompleted");
    expect(header).toContain("totalDropped");
  });
});
