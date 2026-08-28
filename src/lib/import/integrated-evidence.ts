import { ExportPackageSchema } from "@/lib/schemas/export-package";
import type { IntegratedFailureAnalysisParams } from "@/lib/sim/integrated-failure-analysis";
import { POLICIES as SCHEDULING_POLICIES } from "@/lib/sim/scheduling-policy";
import { IO_PATTERNS } from "@/lib/sim/io-benchmark";
import { BOUNDARY_TYPES } from "@/lib/sim/virtualization-isolation";

export const MAX_EVIDENCE_FILE_BYTES = 2 * 1024 * 1024;

export interface ImportedEvidenceSelection {
  moduleId: string;
  selection: Partial<IntegratedFailureAnalysisParams>;
}

function selectedParams(
  pkg: ReturnType<typeof ExportPackageSchema.parse>,
  configModuleId: string,
): Record<string, unknown> | undefined {
  const selectedRun = pkg.schemaVersion === 2 ? pkg.selectedRun : undefined;
  if (selectedRun?.configModuleId === configModuleId) {
    return pkg.runs.find(
      (run) =>
        run.config.moduleId === configModuleId &&
        run.config.scenarioId === selectedRun.scenarioId,
    )?.config.params;
  }
  // Version 1 packages did not identify a selected run. Their run arrays are
  // newest-first, so preserve the historical first-matching-run behavior.
  return pkg.runs.find((run) => run.config.moduleId === configModuleId)?.config.params;
}

export function parseIntegratedEvidencePackage(text: string): ImportedEvidenceSelection {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }

  const parsed = ExportPackageSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The file is not a supported CST505 evidence package.");
  const pkg = parsed.data;

  if (pkg.moduleId === "scheduling-and-concurrency") {
    const params = selectedParams(pkg, "scheduling-policy");
    const policy = params?.policy;
    if (typeof policy !== "string" || !SCHEDULING_POLICIES.includes(policy as never)) {
      throw new Error("The scheduling package does not contain a supported saved policy run.");
    }
    return { moduleId: pkg.moduleId, selection: { schedulingPolicy: policy as IntegratedFailureAnalysisParams["schedulingPolicy"] } };
  }

  if (pkg.moduleId === "virtual-memory") {
    const params = selectedParams(pkg, "virtual-memory");
    if (typeof params?.isolateAnalytics !== "boolean") {
      throw new Error("The memory package does not contain a supported saved control run.");
    }
    return { moduleId: pkg.moduleId, selection: { memoryControlEnabled: params.isolateAnalytics } };
  }

  if (pkg.moduleId === "crash-consistency") {
    const params = selectedParams(pkg, "io-benchmark");
    const pattern = params?.pattern;
    if (typeof pattern !== "string" || !IO_PATTERNS.includes(pattern as never)) {
      throw new Error("The crash-consistency package does not contain a supported I/O policy run.");
    }
    return { moduleId: pkg.moduleId, selection: { durabilityPolicy: pattern as IntegratedFailureAnalysisParams["durabilityPolicy"] } };
  }

  if (pkg.moduleId === "virtualization-and-isolation") {
    const params = selectedParams(pkg, "virtualization-isolation");
    const rawBoundary = params?.boundary;
    const boundary = rawBoundary === "container-unbounded" || rawBoundary === "container-limited"
      ? "container"
      : rawBoundary;
    if (typeof boundary !== "string" || !BOUNDARY_TYPES.includes(boundary as never)) {
      throw new Error("The isolation package does not contain a supported saved boundary run.");
    }
    return { moduleId: pkg.moduleId, selection: { isolationBoundary: boundary as IntegratedFailureAnalysisParams["isolationBoundary"] } };
  }

  throw new Error("Only evidence packages from Simulations 2-5 can be imported here.");
}
