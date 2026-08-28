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
const ExportPackageContentsSchema = z.object({
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

export const SelectedRunSchema = z.object({
  configModuleId: z.string().min(1),
  scenarioId: z.string().min(1),
});

export const LegacyExportPackageSchema = ExportPackageContentsSchema.extend({
  schemaVersion: z.literal(1),
});

export const CurrentExportPackageSchema = ExportPackageContentsSchema.extend({
  schemaVersion: z.literal(SCHEMA_VERSIONS.exportPackage),
  selectedRun: SelectedRunSchema.optional(),
});

/** Accept v1 packages for import while all new exports use v2. */
export const ExportPackageSchema = z.discriminatedUnion("schemaVersion", [
  LegacyExportPackageSchema,
  CurrentExportPackageSchema,
]);

export type ExportPackage = z.infer<typeof ExportPackageSchema>;
export type CurrentExportPackage = z.infer<typeof CurrentExportPackageSchema>;
