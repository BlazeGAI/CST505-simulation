import type { ExportPackage } from "../schemas/export-package";
import { EVIDENCE_RECORD_FIELDS } from "../schemas/evidence-record";

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * Renders an evidence package as CSV with two sections — a per-run metrics
 * table, then an evidence-record key/value table — separated by a blank
 * line. Two sections in one file keeps this readable in a spreadsheet
 * without inventing a second export format.
 */
export function exportPackageToCsv(pkg: ExportPackage): string {
  const lines: string[] = [];

  const metricKeys = Array.from(
    new Set(pkg.runs.flatMap((run) => Object.keys(run.result.metrics))),
  ).sort();

  lines.push(csvRow(["runIndex", "moduleId", "scenarioId", "seed", ...metricKeys]));
  pkg.runs.forEach((run, index) => {
    lines.push(
      csvRow([
        index,
        run.config.moduleId,
        run.config.scenarioId,
        run.config.seed,
        ...metricKeys.map((key) => run.result.metrics[key] ?? ""),
      ]),
    );
  });

  lines.push("");
  lines.push(csvRow(["field", "value"]));
  lines.push(csvRow(["Evidence package label", pkg.evidenceRecord.preparedBy]));
  for (const field of EVIDENCE_RECORD_FIELDS) {
    lines.push(csvRow([field.label, pkg.evidenceRecord[field.key]]));
  }

  return lines.join("\n");
}
