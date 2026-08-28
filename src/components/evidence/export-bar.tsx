"use client";

import { exportPackageToJson } from "@/lib/export/json";
import { exportPackageToCsv } from "@/lib/export/csv";
import { downloadTextFile } from "@/lib/export/download";
import {
  CurrentExportPackageSchema,
  type CurrentExportPackage,
} from "@/lib/schemas/export-package";
import { SCHEMA_VERSIONS } from "@/lib/schemas/version";

const APP_VERSION = "0.3.0";

interface ExportBarProps {
  moduleId: string;
  moduleTitle: string;
  buildPackage: () => Omit<CurrentExportPackage, "schemaVersion" | "appVersion" | "exportedAt">;
}

/**
 * The three required export paths for a Simulation Evidence Record:
 * machine-readable JSON, spreadsheet-friendly CSV, and a print-ready report
 * via the browser's print dialog (Save as PDF). `buildPackage` is supplied
 * by the calling module so this bar never needs to know a module's params
 * or metric shapes.
 */
export function ExportBar({ moduleId, moduleTitle, buildPackage }: ExportBarProps) {
  function toPackage(): CurrentExportPackage {
    return CurrentExportPackageSchema.parse({
      schemaVersion: SCHEMA_VERSIONS.exportPackage,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      ...buildPackage(),
    });
  }

  function handleDownloadJson() {
    const pkg = toPackage();
    downloadTextFile(`${moduleId}-evidence.json`, exportPackageToJson(pkg), "application/json");
  }

  function handleDownloadCsv() {
    const pkg = toPackage();
    downloadTextFile(`${moduleId}-evidence.csv`, exportPackageToCsv(pkg), "text/csv");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="print:hidden flex flex-wrap gap-3" role="group" aria-label={`Export ${moduleTitle} evidence`}>
      <button
        type="button"
        onClick={handleDownloadJson}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Download JSON
      </button>
      <button
        type="button"
        onClick={handleDownloadCsv}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Download CSV
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800"
      >
        Print report
      </button>
    </div>
  );
}
