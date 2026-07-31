import { z } from "zod";
import { SCHEMA_VERSIONS } from "./version";
import { ScenarioConfigSchema } from "./scenario-config";
import { RunResultSchema } from "./run-result";
import { EvidenceRecordSchema } from "./evidence-record";

/**
 * The complete evidence package a student exports: every run they kept for
 * comparison, plus the evidence record that interprets them. `exportedAt`
 * and `appVersion` let a grader tell which build produced a given export.
 */
export const ExportPackageSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSIONS.exportPackage),
  appVersion: z.string(),
  exportedAt: z.string(),
  moduleId: z.string().min(1),
  moduleTitle: z.string().min(1),
  runs: z.array(
    z.object({
      config: ScenarioConfigSchema,
      result: RunResultSchema,
    }),
  ),
  evidenceRecord: EvidenceRecordSchema,
});

export type ExportPackage = z.infer<typeof ExportPackageSchema>;
